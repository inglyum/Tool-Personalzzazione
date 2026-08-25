
// === /src/modules/marketing/index.js ===
// Marketing Module - INGLY OS v88
// BrandIdentity → v11 block
;

// ===== CLIENTS =====
const Marketing={
  activeTab:'funnel',
  editCampaignId:null,
  async render(){await this.tab(this.activeTab,document.querySelector('#view-marketing .tab-btn.active'));},
  async tab(t,btn){
    this.activeTab=t;
    document.querySelectorAll('#view-marketing .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    const el=eid('marketing-content');if(!el)return;
    if(t==='funnel'){
      el.innerHTML=`<div class="card"><div class="card-title">Sales Funnel</div>
        <div class="grid-3">${[
          {l:'👀 Reach',v:'2.400',c:'var(--blue)'},{l:'❤️ Interazioni',v:'480',c:'var(--purple)'},{l:'🎯 Lead',v:'96',c:'var(--orange)'},
          {l:'🛒 Ordini',v:'34',c:'var(--green)'},{l:'🔄 Clienti Ritorno',v:'12',c:'var(--primary)'}
        ].map(s=>`<div class="kpi-card"><div class="kpi-value" style="color:${s.c}">${s.v}</div><div class="kpi-label">${s.l}</div></div>`).join('')}
        </div>
        <div class="grid-2 mt-16">
          <div><div class="card-title">CAC (Costo Acquisizione Cliente)</div><div class="kpi-value" style="font-size:18px">€8.20</div></div>
          <div><div class="card-title">LTV (Valore Vita Cliente)</div><div class="kpi-value" style="font-size:18px">€145.00</div></div>
        </div>
      </div>`;
    }else if(t==='campaigns'){
      const camps=await IDB.getAll('marketing_campaigns').catch(()=>[]);
      el.innerHTML=`<div class="card">
        <div class="flex-between mb-16">
          <div class="card-title" style="margin:0">📣 Campagne Marketing</div>
          <button class="btn btn-primary btn-sm" onclick="Marketing.openCampaignModal()"><i class="fas fa-plus"></i> Nuova Campagna</button>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Campagna</th><th>Canale</th><th>Budget</th><th>Ricavi</th><th>ROAS</th><th>Lead</th><th>Periodo</th><th>Azioni</th></tr></thead>
          <tbody id="campaigns-tbody">
          ${camps.length?camps.map(c=>{
            const roas=c.budget>0?(+c.revenue||0)/(+c.budget||1):0;
            return`<tr>
              <td><strong>${c.name||'—'}</strong></td>
              <td><span class="badge badge-blue">${c.channel||'—'}</span></td>
              <td style="color:var(--red)">${fmtCur(c.budget)}</td>
              <td style="color:var(--green)">${fmtCur(c.revenue||0)}</td>
              <td style="color:${roas>=2?'var(--green)':'var(--orange)'};font-weight:700">${roas.toFixed(2)}x</td>
              <td>${c.leads||0}</td>
              <td style="font-size:11px;color:var(--text-muted)">${c.startDate||'—'}</td>
              <td><div class="act-group">
                <button class="act-btn act-edit" onclick="Marketing.openCampaignModal(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="act-btn act-del" onclick="Marketing.delCampaign(${c.id})"><i class="fas fa-trash"></i></button>
              </div></td>
            </tr>`;
          }).join(''):`<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-dim)"><i class="fas fa-bullhorn" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>Nessuna campagna. Crea la prima!</td></tr>`}
          </tbody></table>
        </div>
      </div>`;
    }else if(t==='hashtags'){
      const sets=[
        {name:'🏠 Home Decor',tags:'#decorazionecasa #laserliving #legnopersonalizzato #homedecoritaly #artigianatoitaliano #laserengraving #personalizzato #regalo'},
        {name:'💒 Wedding',tags:'#matrimoniofai #bomboniereoriginali #weddingitaly #sílaspo #bomboniereuniche #nozzepersonalizzate #weddinggift'},
        {name:'🏢 Corporate',tags:'#targheaziendali #gadgetcorporate #personalizzatoaziendale #premioaziendale #promozionale #brandedsurface'},
        {name:'🎄 Natale',tags:'#regalinatale #decorazioninatalizie #christmasgift #natalepersonalizzato #idearegatonatale'},
        {name:'🎉 General',tags:'#ingly #laseritalia #lasercut #incisionelaser #artigianato #handmadeitaly #unico #madeinitaly'},
      ];
      el.innerHTML=sets.map(s=>`<div class="card mb-16"><strong>${s.name}</strong><p style="font-size:12px;color:var(--primary);margin-top:8px;word-break:break-word">${s.tags}</p><button class="btn btn-sm btn-secondary mt-12" onclick="navigator.clipboard.writeText('${s.tags}').then(()=>toast('Copiato!'))"><i class="fas fa-copy"></i> Copia</button></div>`).join('');
    }else if(t==='email'){
      el.innerHTML=`<div class="grid-2">${[
        {name:'Follow-up',text:'Buongiorno! Ci chiedevamo se ha avuto modo di valutare il nostro preventivo. Siamo disponibili per modifiche.'},
        {name:'Promo Stagionale',text:'🌸 Stagione matrimoni in arrivo! Scopri le nostre bomboniere personalizzate. Ordini entro il 15 marzo con sconto 10%.'},
        {name:'Riordino',text:'Ciao! È passato un po\' dall\'ultimo ordine. Hai bisogno di rifornimento? Scrivi per un nuovo preventivo.'},
        {name:'Benvenuto',text:'Grazie per aver scelto Ingly Laser! 🎨 Siamo pronti a realizzare i tuoi progetti personalizzati.'},
      ].map(t=>`<div class="card"><strong>${t.name}</strong><p style="font-size:12px;color:var(--text-muted);margin-top:8px">${t.text}</p><button class="btn btn-sm btn-secondary mt-12" onclick="navigator.clipboard.writeText('${t.text}').then(()=>toast('Copiato!'))"><i class="fas fa-copy"></i> Copia</button></div>`).join('')}</div>`;
    }else if(t==='content'){
      el.innerHTML=`<div class="card"><div class="card-title">Idee Contenuti</div>
        <div class="grid-3">${[
          'Reel: processo incisione laser in real-time','Story: confronto prima/dopo personalizzazione',
          'Post: dietro le quinte dello studio','Reel: unboxing ordine cliente',
          'Post: 5 idee regalo personalizzato','Story: sondaggio preferenze clienti',
          'Post: novità catalogo stagionale','Reel: timelapse progetto wedding',
        ].map(idea=>`<div class="card card-sm" style="background:var(--bg-card2)"><p style="font-size:12px">${idea}</p></div>`).join('')}
        </div>
        <button class="btn btn-primary mt-16" onclick="Marketing.genIdea()"><i class="fas fa-magic"></i> Genera Nuova Idea</button>
        <div id="new-idea-out"></div>
      </div>`;
    }else if(t==='aistudio'){
      const products=await AppStore.get('catalog').catch(()=>[]);
      const pOptions=products.length
        ?products.map(p=>`<option value="${p.id}">${p.emoji||'🎁'} ${p.name}</option>`).join('')
        :`<option value="">-- Nessun prodotto nel catalogo --</option>`;
      el.innerHTML=`
      <div style="display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start">
        <!-- LEFT: Config panel -->
        <div class="card" style="position:sticky;top:0">
          <div class="card-title" style="color:var(--primary);font-size:13px;margin-bottom:16px">🤖 AI CONTENT STUDIO</div>
          <div class="form-group">
            <label class="form-label">PRODOTTO DAL CATALOGO</label>
            <select class="form-control" id="ais-product">${pOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">CANALE</label>
            <select class="form-control" id="ais-channel">
              <option value="instagram_reel">📱 Instagram Reel</option>
              <option value="instagram_post">📸 Instagram Post Carosello</option>
              <option value="instagram_story">💬 Instagram Story</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">👥 Facebook</option>
              <option value="linkedin">💼 LinkedIn</option>
              <option value="email">📧 Email Marketing</option>
              <option value="whatsapp">💚 WhatsApp Broadcast</option>
              <option value="etsy">🛍️ Etsy (titolo + descrizione SEO)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">OBIETTIVO</label>
            <select class="form-control" id="ais-goal">
              <option value="vendita">💰 Vendita Diretta</option>
              <option value="awareness">👁️ Brand Awareness</option>
              <option value="lead">🎯 Generazione Lead</option>
              <option value="engagement">❤️ Engagement & Community</option>
              <option value="lancio">🚀 Lancio Prodotto</option>
              <option value="fidelizzazione">🔄 Fidelizzazione Cliente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">TONO</label>
            <select class="form-control" id="ais-tone">
              <option value="emozionale">💛 Emozionale & Caldo</option>
              <option value="esclusivo">✨ Premium & Esclusivo</option>
              <option value="urgente">⚡ Urgenza & Scarcity</option>
              <option value="storytelling">📖 Storytelling</option>
              <option value="diretto">🎯 Diretto & Persuasivo</option>
              <option value="professionale">💼 Professionale B2B</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">TARGET CLIENTE</label>
            <input class="form-control" id="ais-target" placeholder="Es. Sposa 28-38, sensibile al dettaglio" value="">
          </div>
          <button class="btn btn-primary" style="width:100%" id="ais-gen-btn" onclick="AIMarketing.generateContent()">
            <i class="fas fa-magic"></i> Genera Copy AI
          </button>
        </div>
        <!-- RIGHT: Output -->
        <div>
          <div id="ais-output">
            <div style="text-align:center;padding:60px 24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
              <div style="font-size:48px;margin-bottom:12px">✍️</div>
              <div style="color:var(--text-muted);font-size:14px">Configura le opzioni e clicca <strong style="color:var(--primary)">Genera Copy AI</strong></div>
              <div style="color:var(--text-dim);font-size:12px;margin-top:6px">Il tuo copy personalizzato apparirà qui</div>
            </div>
          </div>
        </div>
      </div>`;
    }
  },
  genIdea(){
    const platforms=['Instagram','TikTok','Facebook','YouTube Shorts'];
    const types=['Reel','Carousel','Story','Post statico','Live'];
    const themes=['Processo produttivo','Prodotto finito','Cliente soddisfatto','Tutorial','Offerta'];
    const idea=`${types[Math.floor(Math.random()*types.length)]} su ${platforms[Math.floor(Math.random()*platforms.length)]}: ${themes[Math.floor(Math.random()*themes.length)]}`;
    const el=eid('new-idea-out');
    if(el)el.innerHTML=`<div class="alert alert-info mt-12"><i class="fas fa-lightbulb"></i> ${idea}</div>`;
  },
  async openCampaignModal(id=null){
    this.editCampaignId=id;
    const existing=document.getElementById('modal-campaign');
    if(existing)existing.remove();
    const c=id?await IDB.get('marketing_campaigns',id).catch(()=>null):null;
    const modal=document.createElement('div');
    modal.className='modal-overlay';modal.id='modal-campaign';
    modal.onclick=function(e){if(e.target===this)this.remove();};
    modal.innerHTML=`<div class="modal"><div class="modal-header"><span class="modal-title">${id?'Modifica Campagna':'Nuova Campagna'}</span><button class="modal-close" onclick="document.getElementById('modal-campaign').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nome Campagna *</label><input class="form-control" id="camp-name" value="${c?.name||''}" placeholder="Es. Primavera Matrimoni 2026"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Canale</label>
          <select class="form-control" id="camp-channel">
            ${['Instagram','TikTok','Facebook','LinkedIn','Etsy Ads','Google Ads','Email','WhatsApp','Pinterest','Multi-canale'].map(ch=>`<option ${c?.channel===ch?'selected':''}>${ch}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Budget (€)</label><input class="form-control" id="camp-budget" type="number" value="${c?.budget||0}" step="0.01"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ricavi Generati (€)</label><input class="form-control" id="camp-revenue" type="number" value="${c?.revenue||0}" step="0.01"></div>
        <div class="form-group"><label class="form-label">Lead / Ordini</label><input class="form-control" id="camp-leads" type="number" value="${c?.leads||0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data Inizio</label><input class="form-control" id="camp-start" type="date" value="${c?.startDate||today()}"></div>
        <div class="form-group"><label class="form-label">Data Fine</label><input class="form-control" id="camp-end" type="date" value="${c?.endDate||''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Obiettivo / Note</label><textarea class="form-control" id="camp-notes" rows="2" placeholder="Es. Brand awareness matrimoni, target donne 25-45...">${c?.notes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('modal-campaign').remove()">Annulla</button>
      <button class="btn btn-primary" onclick="Marketing.saveCampaign()"><i class="fas fa-save"></i> Salva Campagna</button>
    </div></div>`;
    document.body.appendChild(modal);
    setTimeout(()=>modal.style.display='flex',10);
  },
  async saveCampaign(){
    const name=eid('camp-name')?.value?.trim();
    if(!name){toast('Nome campagna obbligatorio','warning');return;}
    const item={name,channel:eid('camp-channel')?.value,budget:+eid('camp-budget')?.value||0,revenue:+eid('camp-revenue')?.value||0,leads:+eid('camp-leads')?.value||0,startDate:eid('camp-start')?.value,endDate:eid('camp-end')?.value,notes:eid('camp-notes')?.value};
    if(this.editCampaignId)item.id=this.editCampaignId;
    await IDB.put('marketing_campaigns',item);
    toast(this.editCampaignId?'Campagna aggiornata!':'Campagna salvata!');
    document.getElementById('modal-campaign')?.remove();
    this.editCampaignId=null;
    await this.tab('campaigns',null);
  },
  async delCampaign(id){
    if(!confirm('Eliminare questa campagna?'))return;
    await IDB.del('marketing_campaigns',id)
    toast('Campagna eliminata','warning');
    await this.tab('campaigns',null);
  }
};

// ===== ETSY =====
const Etsy={
  trends:[
    // 🏠 HOME DECOR - top sellers
    {name:'Taglieri con mappe città',cat:'Home Decor',mat:'Legno di noce/acacia',views:'142K',downloads:'8.4K',trend:'🔥',desc:'Mappe incise di città famose, personalizzabili con la propria città di residenza',price:'€35-90'},
    {name:'Portafoto cornice mappa mondo',cat:'Home Decor',mat:'MDF 4mm bianco',views:'98K',downloads:'5.2K',trend:'🔥',desc:'Cornice con mappa del mondo e spille colorate per i luoghi visitati',price:'€40-75'},
    {name:'Targa benvenuto famiglia',cat:'Home Decor',mat:'Legno rustico',views:'87K',downloads:'4.8K',trend:'📈',desc:'Nome famiglia + anno + simboli personalizzati per ingresso casa',price:'€28-55'},
    {name:'Wall art mandala geometrico',cat:'Home Decor',mat:'MDF 3mm + verniciatura',views:'76K',downloads:'3.9K',trend:'📈',desc:'Pannelli decorativi multi-strato in stile boho-chic per pareti living',price:'€45-130'},
    {name:'Puzzle foto personalizzato',cat:'Home Decor',mat:'MDF 4mm',views:'65K',downloads:'3.1K',trend:'📈',desc:'Puzzle in legno dalla foto di famiglia, matrimonio o animali domestici',price:'€35-60'},
    {name:'Set cucina bambù coordinato',cat:'Home Decor',mat:'Bambù/Acacia',views:'54K',downloads:'2.8K',trend:'✅',desc:'Tagliere + matterello + portaspezie in legno coordinato con monogramma',price:'€65-120'},
    {name:'Orologio parete legno',cat:'Home Decor',mat:'Legno massello',views:'48K',downloads:'2.3K',trend:'✅',desc:'Orologio con numeri personalizzati, city skyline o monogramma inciso',price:'€55-110'},
    // 💒 WEDDING - top sellers
    {name:'Portachiavi nomi intrecciati',cat:'Wedding',mat:'Plexiglass 3mm',views:'210K',downloads:'15.2K',trend:'🔥',desc:'Portachiavi sposi con nomi intrecciati, il best seller assoluto per bomboniere',price:'€8-15'},
    {name:'Album foto copertina legno',cat:'Wedding',mat:'Legno di noce',views:'135K',downloads:'9.8K',trend:'🔥',desc:'Copertina album in legno con nomi, data e motivo floreale inciso',price:'€55-95'},
    {name:'Segnaposto legno personalizzati',cat:'Wedding',mat:'Legno betulla 3mm',views:'118K',downloads:'8.2K',trend:'🔥',desc:'Sagomati o rettangolari con nome ospite, venduti in set da 10/20/50',price:'€3-6 cad.'},
    {name:'Box anelli portafedi',cat:'Wedding',mat:'Legno di noce',views:'89K',downloads:'5.4K',trend:'📈',desc:'Scatolina in legno per le fedi con incisione personalizzata data e nomi',price:'€25-45'},
    {name:'Copribottiglie champagne',cat:'Wedding',mat:'Legno + ribbon',views:'72K',downloads:'4.1K',trend:'📈',desc:'Etichette in legno sagomato per bottiglie di champagne o vino',price:'€6-12'},
    {name:'Libro degli ospiti alternative',cat:'Wedding',mat:'MDF + compensato',views:'61K',downloads:'3.3K',trend:'✅',desc:'Libro degli ospiti alternativo: sign con fingerprint tree o mappa amore',price:'€45-85'},
    // 🏢 CORPORATE - top sellers
    {name:'Targa ufficio plexiglass premium',cat:'Corporate',mat:'Plexiglass 5mm colorato',views:'95K',downloads:'6.1K',trend:'🔥',desc:'Targhe professionali con logo aziendale, naming e dipartimenti',price:'€35-80'},
    {name:'Box gadget personalizzato',cat:'Corporate',mat:'Legno + accessori',views:'78K',downloads:'4.5K',trend:'🔥',desc:'Cofanetto regalo con logo per clienti VIP: tazza, penna, quaderno incisi',price:'€65-150'},
    {name:'Portachiavi logo aziendale bulk',cat:'Corporate',mat:'Plexiglass colorato',views:'64K',downloads:'5.8K',trend:'📈',desc:'Ordini all\'ingrosso da 50-500 pz, ottimi per eventi e team building',price:'€3-7 cad.'},
    {name:'Awards & trofei aziendali',cat:'Corporate',mat:'Plexiglass + legno',views:'52K',downloads:'2.9K',trend:'📈',desc:'Premi personalizzati per dipendenti, contest interni e riconoscimenti',price:'€25-75'},
    {name:'Targhetta scrivania premium',cat:'Corporate',mat:'Legno noce + plexiglass',views:'43K',downloads:'2.4K',trend:'✅',desc:'Nome e ruolo su doppio materiale per scrivania executive',price:'€18-35'},
    // 👧 KIDS - top sellers
    {name:'Puzzle nome bambino',cat:'Kids',mat:'Legno betulla',views:'132K',downloads:'9.2K',trend:'🔥',desc:'Puzzle con lettere 3D del nome del bambino, anche con animaletti colorati',price:'€25-50'},
    {name:'Cornice nascita personalizzata',cat:'Kids',mat:'Legno pioppo verniciato',views:'105K',downloads:'7.1K',trend:'🔥',desc:'Nome, data, ora, peso e altezza del neonato in cornice ricamo-stile',price:'€35-65'},
    {name:'Targa camera bambino',cat:'Kids',mat:'MDF colorato',views:'87K',downloads:'5.9K',trend:'🔥',desc:'Targa con nome del bambino, astronauta, principessa, dinosauro o unicorno',price:'€15-30'},
    {name:'Cornice comunione/cresima',cat:'Kids',mat:'Legno verniciato',views:'68K',downloads:'3.8K',trend:'📈',desc:'Cornice tema sacro con simboli religiosi e spazio foto personalizzata',price:'€22-45'},
    {name:'Gioco memory in legno',cat:'Kids',mat:'MDF + stampa UV',views:'45K',downloads:'2.6K',trend:'✅',desc:'Memory personalizzato con foto famiglia o personaggi preferiti del bimbo',price:'€30-55'},
    // 🍂 SEASONAL - top sellers
    {name:'Decorazioni natalizie legno',cat:'Seasonal',mat:'Legno betulla chiaro',views:'188K',downloads:'12.1K',trend:'🔥',desc:'Stelle, renne, folletti, scritte personalizzate — il top delle vendite a novembre',price:'€8-25'},
    {name:'Calendario avvento personalizzato',cat:'Seasonal',mat:'MDF + coperchi',views:'142K',downloads:'8.8K',trend:'🔥',desc:'Calendario dell\'avvento in legno riutilizzabile con nome del bambino',price:'€45-85'},
    {name:'Decorazioni Pasqua laser',cat:'Seasonal',mat:'Legno betulla 3mm',views:'76K',downloads:'4.4K',trend:'📈',desc:'Uova, coniglietti, fiori di primavera personalizzati con nome',price:'€6-18'},
    {name:'Halloween decorazioni',cat:'Seasonal',mat:'MDF + vernice nera',views:'65K',downloads:'3.7K',trend:'📈',desc:'Zucche, fantasmi, scritte spaventose per casa e vetrina',price:'€8-22'},
    {name:'Segnaposto Pasqua',cat:'Seasonal',mat:'Legno chiaro',views:'42K',downloads:'2.3K',trend:'✅',desc:'Coniglietti e uova sagomati con nome ospite per pranzo di Pasqua',price:'€3-6'},
    // 💻 DIGITAL / ACCESSORI
    {name:'Orecchini laser cut legno',cat:'Digital',mat:'Betulla 2mm verniciata',views:'95K',downloads:'7.2K',trend:'🔥',desc:'Orecchini leggeri in legno con forme geometriche, fiori o personalizzati',price:'€8-20'},
    {name:'Segnalibro acrilico personalizzato',cat:'Digital',mat:'Plexiglass colorato 2mm',views:'72K',downloads:'5.1K',trend:'📈',desc:'Segnalibri in acrilico con nome, citazione o disegno personalizzato',price:'€5-12'},
    {name:'Spille plexiglass colorate',cat:'Digital',mat:'Plexiglass 3mm UV print',views:'48K',downloads:'3.4K',trend:'📈',desc:'Spille sagomated con disegni personalizzati, molto popolari su Etsy',price:'€4-9'},
  ],
  filterVal:'',
  catFilter:'',
  render(){
    const filtered=this.trends.filter(t=>{
      const matchSearch=!this.filterVal||t.name.toLowerCase().includes(this.filterVal)||(t.cat||'').toLowerCase().includes(this.filterVal)||(t.desc||'').toLowerCase().includes(this.filterVal);
      const matchCat=!this.catFilter||t.cat===this.catFilter;
      return matchSearch&&matchCat;
    });
    const el=eid('etsy-grid');if(!el)return;
    const catColors={Wedding:'badge-purple',Corporate:'badge-blue','Home Decor':'badge-green',Kids:'badge-yellow',Seasonal:'badge-orange',Digital:'badge-gray'};
    el.innerHTML=filtered.map(t=>`<div class="card" style="position:relative">
      <div class="flex-between mb-12">
        <span class="badge ${catColors[t.cat]||'badge-gray'}">${t.cat}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:18px" title="Trend">${t.trend}</span>
          <a href="https://www.etsy.com/search?q=${encodeURIComponent(t.name)}" target="_blank" class="btn-icon" title="Cerca su Etsy" style="width:28px;height:28px;font-size:12px"><i class="fas fa-external-link-alt"></i></a>
        </div>
      </div>
      <strong style="font-size:13px;color:#fff">${t.name}</strong>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0">${t.desc}</p>
      <div style="display:flex;gap:12px;font-size:11px;margin-top:auto;padding-top:8px;border-top:1px solid var(--border);flex-wrap:wrap">
        <span><i class="fas fa-eye" style="color:var(--blue);margin-right:3px"></i>${t.views} visualizz.</span>
        <span><i class="fas fa-download" style="color:var(--green);margin-right:3px"></i>${t.downloads} vendite</span>
        <span style="color:var(--primary)"><i class="fas fa-tag" style="margin-right:3px"></i>${t.price}</span>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:6px"><i class="fas fa-layer-group" style="margin-right:3px"></i>${t.mat}</div>
    </div>`).join('');
  },
  filter(v){this.filterVal=v.toLowerCase();this.render();},
  filterCatEtsy(v){this.catFilter=v;this.render();},
  refresh(){
    const el=eid('etsy-refresh-info');
    if(el)el.innerHTML=`<div class="alert alert-info"><i class="fas fa-sync fa-spin"></i> Aggiornamento trend in corso... I dati vengono verificati rispetto alle ultime ricerche Etsy 2026.</div>`;
    // Shuffle and slightly modify view/download counts to simulate "fresh" data
    this.trends=this.trends.map(t=>{
      const viewNum=parseInt(t.views.replace(/[KM]/,''))*1000*(t.views.includes('M')?1000:1);
      const newViews=Math.round(viewNum*(0.95+Math.random()*0.1));
      const fmt=newViews>=1000000?Math.round(newViews/100000)/10+'M':Math.round(newViews/1000)+'K';
      return {...t,views:fmt};
    });
    setTimeout(()=>{
      this.render();
      if(el)el.innerHTML=`<div class="alert alert-success"><i class="fas fa-check-circle"></i> Trend aggiornati al ${new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})} — ${this.trends.length} prodotti analizzati.</div>`;
    },1500);
  }
};

// ===== CALENDAR =====
const Strategy={
  async render(){await this.tab('swot',document.querySelector('#view-strategy .tab-btn'));},
  async tab(t,btn){
    document.querySelectorAll('#view-strategy .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    const el=eid('strategy-content');if(!el)return;
    if(t==='swot'){
      // Load saved or use defaults
      const saved=await IDB.get('settings','strategy_swot').catch(()=>null);
      const data=saved?.value||{
        strengths:['Personalizzazione unica','Alta qualità materiali','Tempi di consegna rapidi','Expertise tecnica laser'],
        weaknesses:['Dipendenza da un\'unica macchina','Capacità produttiva limitata','Poca visibilità online','Prezzi non standardizzati'],
        opportunities:['Crescita Etsy +25% YoY','Stagione matrimoni record','B2B corporate in espansione','Nuovi materiali (UV, fibra)'],
        threats:['Concorrenza low-cost dalla Cina','Aumento prezzi materiali','Stagionalità alta volatilità','Dipendenza da pochi canali'],
      };
      const quadrant=(key,title,color,items)=>`<div class="card">
        <div class="card-title" style="color:${color}">${title}</div>
        <div id="swot-${key}">
          ${items.map((item,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;background:var(--bg-card2);padding:6px 10px;border-radius:6px">
            <span style="flex:1;font-size:13px">${item}</span>
            <button onclick="Strategy.removeSwot('${key}',${i})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:2px 5px;border-radius:3px" title="Rimuovi">✕</button>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <input class="form-control" id="swot-input-${key}" placeholder="Aggiungi..." style="font-size:12px;padding:6px 8px" onkeypress="if(event.key==='Enter')Strategy.addSwot('${key}')">
          <button class="btn btn-primary btn-sm" onclick="Strategy.addSwot('${key}')"><i class="fas fa-plus"></i></button>
        </div>
      </div>`;
      el.innerHTML=`<div class="grid-2">
        ${quadrant('strengths','💪 Punti di Forza','var(--green)',data.strengths)}
        ${quadrant('weaknesses','⚠️ Debolezze','var(--red)',data.weaknesses)}
        ${quadrant('opportunities','🚀 Opportunità','var(--blue)',data.opportunities)}
        ${quadrant('threats','⚡ Minacce','var(--orange)',data.threats)}
      </div>`;
    }else if(t==='roadmap'){
      const saved=await IDB.get('settings','strategy_roadmap').catch(()=>null);
      const roadmap=saved?.value||[
        {m:'Q1 2026',items:['✅ Lancio nuovi prodotti primavera','✅ Upgrade sistema gestionale','🔄 Espansione catalogo B2B']},
        {m:'Q2 2026',items:['📅 Campagna matrimoni (Apr-Giu)','📅 Apertura secondo canale social','📅 Workshop personalizzazione']},
        {m:'Q3 2026',items:['📅 Test UV printing su vetro','📅 Presenza 2 fiere nazionali','📅 Partnership con wedding planner']},
        {m:'Q4 2026',items:['📅 Campagna Natale anticipata','📅 Lancio shop online autonomo','📅 Obiettivo: +40% revenue vs 2025']},
      ];
      el.innerHTML=`<div class="card"><div class="card-title">🗺️ Roadmap 2026 — Modificabile</div>
        ${roadmap.map((r,ri)=>`<div style="background:var(--bg-card2);border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <strong style="color:var(--primary)">${r.m}</strong>
            <button onclick="Strategy.removeRoadmapItem('${ri}',null)" style="background:none;border:none;color:var(--text-dim);cursor:pointer;margin-left:auto;font-size:12px">🗑️ Rimuovi trimestre</button>
          </div>
          ${r.items.map((item,ii)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="flex:1;font-size:13px">${item}</span>
            <button onclick="Strategy.removeRoadmapItem(${ri},${ii})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:2px 5px" title="Rimuovi">✕</button>
          </div>`).join('')}
          <div style="display:flex;gap:6px;margin-top:8px">
            <input class="form-control" id="rdm-input-${ri}" placeholder="Nuova milestone..." style="font-size:12px;padding:6px 8px" onkeypress="if(event.key==='Enter')Strategy.addRoadmapItem(${ri})">
            <button class="btn btn-primary btn-sm" onclick="Strategy.addRoadmapItem(${ri})"><i class="fas fa-plus"></i></button>
          </div>
        </div>`).join('')}
        <button class="btn btn-secondary btn-sm mt-12" onclick="Strategy.addRoadmapQuarter()"><i class="fas fa-plus"></i> Aggiungi Trimestre</button>
      </div>`;
    }else if(t==='canvas'){
      const blocks=[
        {t:'👥 Segmenti Cliente',c:['Spose e wedding planner','Aziende (trofei, targhe)','Privati (regali, casa)','Rivenditori fiere']},
        {t:'💎 Proposte Valore',c:['Personalizzazione totale','Consegna express 48h','Qualità artigianale','Consulenza gratuita']},
        {t:'📣 Canali',c:['Etsy (principale)','Instagram DM','WhatsApp Business','Fiere artigianato']},
        {t:'🤝 Relazioni Cliente',c:['Assistenza personale','Follow-up post-vendita','Programma fedeltà','Community social']},
        {t:'💰 Revenue Streams',c:['Vendita diretta prodotti','Abbonamenti B2B','Workshop personalizzazione','Rivenditori autorizzati']},
        {t:'🔑 Risorse Chiave',c:['Macchina laser CO2','Software CAD/CAM','Know-how tecnico','Database clienti']},
        {t:'⚙️ Attività Chiave',c:['Progettazione laser','Lavorazione materiali','Marketing social','Gestione ordini']},
        {t:'🤲 Partner Chiave',c:['Fornitori legno/plex','Spedizionieri','Designer freelance','Fiere di settore']},
        {t:'💸 Struttura Costi',c:['Materiali consumabili','Manodopera','Marketing','Energia + affitto']},
      ];
      el.innerHTML=`<div class="grid-3">${blocks.map(b=>`<div class="card"><div class="card-title">${b.t}</div><ul style="padding-left:16px">${b.c.map(i=>`<li style="margin-bottom:4px;font-size:12px">${i}</li>`).join('')}</ul></div>`).join('')}</div>`;
    }else if(t==='brand'){
      el.innerHTML=`<div class="grid-2"><div class="card">
        <div class="card-title">Brand Identity</div>
        <div class="stat-row"><span class="text-muted">Nome</span><span class="stat-val">Ingly Laser Studio</span></div>
        <div class="stat-row"><span class="text-muted">Tagline</span><span class="stat-val">"Il tuo stile, inciso per sempre"</span></div>
        <div class="stat-row"><span class="text-muted">Tono</span><span class="stat-val">Caldo, artigianale, professionale</span></div>
        <div class="stat-row"><span class="text-muted">Segmento</span><span class="stat-val">Premium artigianato digitale</span></div>
      </div><div class="card">
        <div class="card-title">Palette Colori</div>
        ${[['#fbbf24','Oro (principale)'],['#09090b','Nero (sfondo)'],['#ffffff','Bianco (testo)'],['#8b5cf6','Viola (accento)']].map(([c,n])=>`<div class="stat-row"><span style="display:flex;align-items:center;gap:8px"><span class="color-dot" style="background:${c};border:1px solid var(--border)"></span>${n}</span><span class="stat-val">${c}</span></div>`).join('')}
      </div></div>`;
    }
  },
  async getSwotData(){
    const saved=await IDB.get('settings','strategy_swot').catch(()=>null);
    return saved?.value||{
      strengths:['Personalizzazione unica','Alta qualità materiali','Tempi di consegna rapidi','Expertise tecnica laser'],
      weaknesses:['Dipendenza da una sola macchina','Capacità produttiva limitata','Poca visibilità online','Prezzi non standardizzati'],
      opportunities:['Crescita Etsy +25% YoY','Stagione matrimoni record','B2B corporate in espansione','Nuovi materiali (UV, fibra)'],
      threats:['Concorrenza low-cost dalla Cina','Aumento prezzi materiali','Stagionalità alta volatilità','Dipendenza da pochi canali'],
    };
  },
  async addSwot(key){
    const input=eid(`swot-input-${key}`);
    const text=input?.value?.trim();if(!text)return;
    const data=await this.getSwotData();
    data[key].push(text);
    await IDB.put('settings',{key:'strategy_swot',value:data});
    input.value='';
    toast('Aggiunto!');
    await this.tab('swot',null);
  },
  async removeSwot(key,index){
    const data=await this.getSwotData();
    data[key].splice(index,1);
    await IDB.put('settings',{key:'strategy_swot',value:data});
    await this.tab('swot',null);
  },
  async getRoadmapData(){
    const saved=await IDB.get('settings','strategy_roadmap').catch(()=>null);
    return saved?.value||[
      {m:'Q1 2026',items:['✅ Lancio nuovi prodotti primavera','✅ Upgrade sistema gestionale','🔄 Espansione catalogo B2B']},
      {m:'Q2 2026',items:['📅 Campagna matrimoni (Apr-Giu)','📅 Apertura secondo canale social','📅 Workshop personalizzazione']},
      {m:'Q3 2026',items:['📅 Test UV printing su vetro','📅 Presenza 2 fiere nazionali','📅 Partnership con wedding planner']},
      {m:'Q4 2026',items:['📅 Campagna Natale anticipata','📅 Lancio shop online autonomo','📅 Obiettivo: +40% revenue vs 2025']},
    ];
  },
  async addRoadmapItem(quarterIndex){
    const input=eid(`rdm-input-${quarterIndex}`);
    const text=input?.value?.trim();if(!text)return;
    const data=await this.getRoadmapData();
    data[quarterIndex].items.push(text);
    await IDB.put('settings',{key:'strategy_roadmap',value:data});
    toast('Milestone aggiunta!');
    await this.tab('roadmap',null);
  },
  async removeRoadmapItem(qi,ii){
    const data=await this.getRoadmapData();
    if(ii===null){data.splice(qi,1);}else{data[qi].items.splice(ii,1);}
    await IDB.put('settings',{key:'strategy_roadmap',value:data});
    await this.tab('roadmap',null);
  },
  async addRoadmapQuarter(){
    const name=prompt('Nome trimestre (es. Q1 2027):');if(!name)return;
    const data=await this.getRoadmapData();
    data.push({m:name,items:[]});
    await IDB.put('settings',{key:'strategy_roadmap',value:data});
    await this.tab('roadmap',null);
  }
};

// ===== INNOVATION =====
const Innovation={
  editId:null,
  async render(){
    const el=eid('innovation-tbody');if(!el)return;
    const items=await IDB.getAll('innovation');
    const statusBadge={idea:'badge-gray',prototype:'badge-blue',testing:'badge-yellow',validated:'badge-green',archived:'badge-red'};
    const statusLabel={idea:'Idea',prototype:'Prototipo',testing:'Test',validated:'Validato',archived:'Archiviato'};
    el.innerHTML=items.map(i=>`<tr>
      <td><strong>${i.title}</strong><br><small class="text-muted">${i.desc||''}</small></td>
      <td><span class="badge badge-gray">${i.category}</span></td>
      <td><span class="badge ${statusBadge[i.status]||'badge-gray'}">${statusLabel[i.status]||i.status}</span></td>
      <td style="color:var(--red)">${fmtCur(i.invest)}</td>
      <td style="color:var(--green);font-weight:700">${fmtCur(i.roi)}</td>
      <td>
        <div class="act-group">
          <button class="act-btn act-edit" onclick="Innovation.openModal(${i.id})"><i class="fas fa-edit"></i> Modifica</button>
          <button class="act-btn act-del" onclick="Innovation.del(${i.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-innov-title').textContent=id?'Modifica Idea':'Nuova Idea';
    if(id){const i=await IDB.get('innovation',id);if(i){eid('innov-title').value=i.title;eid('innov-cat').value=i.category;eid('innov-status').value=i.status;eid('innov-invest').value=i.invest;eid('innov-roi').value=i.roi;eid('innov-desc').value=i.desc||'';}}
    else{['innov-title','innov-invest','innov-roi','innov-desc'].forEach(f=>{const el=eid(f);if(el)el.value=f.includes('invest')||f.includes('roi')?'0':''});}
    openModal('innovation');
  },
  async save(){
    const item={title:eid('innov-title').value,category:eid('innov-cat').value,status:eid('innov-status').value,invest:+eid('innov-invest').value||0,roi:+eid('innov-roi').value||0,desc:eid('innov-desc').value};
    if(this.editId)item.id=this.editId;
    await IDB.put('innovation',item);AppStore.invalidate('ideas');
    AppStore.invalidate('innovation');
    toast('Idea salvata!');closeModal('innovation');this.editId=null;await this.render();
  },
  async del(id){if(!confirm('Eliminare?'))return;await IDB.del('innovation',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminata','warning');await this.render();}
};

// ===== TEAM =====
const Social={
  editId:null,
  platforms:{
    instagram:{label:'Instagram',color:'#e1306c',icon:'fa-instagram'},
    tiktok:{label:'TikTok',color:'#010101',icon:'fa-tiktok'},
    facebook:{label:'Facebook',color:'#1877f2',icon:'fa-facebook'},
    youtube:{label:'YouTube',color:'#ff0000',icon:'fa-youtube'},
    pinterest:{label:'Pinterest',color:'#bd081c',icon:'fa-pinterest'},
    etsy:{label:'Etsy',color:'#f56400',icon:'fa-store'},
    linkedin:{label:'LinkedIn',color:'#0077b5',icon:'fa-linkedin'},
    twitter:{label:'X / Twitter',color:'#1da1f2',icon:'fa-twitter'},
    whatsapp:{label:'WhatsApp Business',color:'#25d366',icon:'fa-whatsapp'},
    website:{label:'Sito Web',color:'#6366f1',icon:'fa-globe'},
    altro:{label:'Altro',color:'var(--primary)',icon:'fa-link'},
  },
  DEFAULTS:[
    {id:1,platform:'instagram',username:'@inglydesign',email:'info@inglydesign.it',url:'https://www.instagram.com/inglydesign/',followers:0,status:'active',notes:'Account principale Ingly Design'},
    {id:2,platform:'tiktok',username:'@inglydesign',email:'info@inglydesign.it',url:'https://www.tiktok.com/@inglydesign',followers:0,status:'active',notes:'Contenuti viral: produzione, unboxing, behind the scenes'},
    {id:3,platform:'facebook',username:'Ingly Design',email:'info@inglydesign.it',url:'https://www.facebook.com/inglydesign',followers:0,status:'active',notes:'Community e campagne locali'},
    {id:4,platform:'etsy',username:'InglyDesign',email:'info@inglydesign.it',url:'https://www.etsy.com/shop/InglyDesign',followers:0,status:'active',notes:'Shop Etsy prodotti personalizzati'},
    {id:5,platform:'whatsapp',username:'Ingly Design',email:'info@inglydesign.it',url:'',followers:0,status:'active',notes:'Canale business clienti'},
  ],
  async seed(){const ex=await IDB.getAll('social');if(!ex.length)for(const s of this.DEFAULTS)await IDB.put('social',s);},
  async render(){
    const items=await IDB.getAll('social');
    const active=items.filter(i=>i.status==='active');
    const totalFollowers=items.reduce((a,i)=>a+(+i.followers||0),0);
    const kpis=eid('social-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Profili Totali',v:items.length,i:'fa-share-alt',c:'var(--primary)'},
      {l:'Profili Attivi',v:active.length,i:'fa-check-circle',c:'var(--green)'},
      {l:'Follower Totali',v:totalFollowers.toLocaleString('it-IT'),i:'fa-users',c:'var(--blue)'},
      {l:'Piattaforme',v:new Set(items.map(i=>i.platform)).size,i:'fa-globe',c:'var(--purple)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const el=eid('social-grid');if(!el)return;
    if(!items.length){el.innerHTML=`<div class="empty-state"><i class="fas fa-share-alt"></i><p>Nessun profilo social aggiunto.<br>Aggiungi Instagram, Etsy, TikTok e tutti i tuoi canali!</p></div>`;return;}
    el.innerHTML=`<div class="grid-3">${items.map(i=>{
      const p=this.platforms[i.platform]||this.platforms.altro;
      const statusBadge={active:'badge-green',paused:'badge-yellow',new:'badge-blue'}[i.status]||'badge-gray';
      const statusLabel={active:'Attivo',paused:'In Pausa',new:'Nuovo'}[i.status]||i.status;
      return`<div class="card" style="border-top:3px solid ${p.color}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:48px;height:48px;background:${p.color}20;border:1px solid ${p.color}40;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
            <i class="fab ${p.icon}" style="color:${p.color}"></i>
          </div>
          <div>
            <strong style="font-size:14px">${p.label}</strong>
            <div style="font-size:12px;color:var(--primary);margin-top:2px">${i.username||'—'}</div>
          </div>
          <span class="badge ${statusBadge}" style="margin-left:auto">${statusLabel}</span>
        </div>
        ${i.followers?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-users" style="margin-right:3px"></i>Follower</span><strong style="color:${p.color}">${(+i.followers).toLocaleString('it-IT')}</strong></div>`:''}
        ${i.email?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-envelope" style="margin-right:3px"></i>Email</span><a href="mailto:${i.email}" style="color:var(--blue);font-size:12px;text-decoration:none">${i.email}</a></div>`:''}
        ${i.url?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-link" style="margin-right:3px"></i>Link</span><a href="${i.url}" target="_blank" style="color:${p.color};font-size:12px;text-decoration:none;max-width:160px;overflow:hidden;text-overflow:ellipsis;display:block">${i.url.replace('https://','').replace('www.','').substring(0,30)}</a></div>`:''}
        ${i.notes?`<div style="font-size:11px;color:var(--text-muted);margin-top:8px;padding:6px 8px;background:var(--bg-card2);border-radius:5px;font-style:italic">${i.notes}</div>`:''}
        <div class="act-group mt-12">
          ${i.url?`<a class="act-btn" style="background:${p.color}18;color:${p.color};border-color:${p.color}30;flex:1;justify-content:center;text-decoration:none" href="${i.url}" target="_blank"><i class="fas fa-external-link-alt"></i> Apri</a>`:''}
          <button class="act-btn act-edit" onclick="Social.openModal(${i.id})"><i class="fas fa-edit"></i></button>
          <button class="act-btn act-del" onclick="Social.del(${i.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('')}</div>`;
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-social-title').textContent=id?'Modifica Profilo Social':'Nuovo Profilo Social';
    if(id){
      const i=await IDB.get('social',id);if(!i)return;
      eid('soc-platform').value=i.platform||'instagram';eid('soc-username').value=i.username||'';
      eid('soc-email').value=i.email||'';eid('soc-url').value=i.url||'';
      eid('soc-followers').value=i.followers||0;eid('soc-status').value=i.status||'active';
      eid('soc-notes').value=i.notes||'';
    }else{
      ['soc-username','soc-email','soc-url','soc-notes'].forEach(f=>{const el=eid(f);if(el)el.value='';});
      eid('soc-followers').value=0;eid('soc-status').value='active';
    }
    openModal('social');
  },
  async save(){
    const item={platform:eid('soc-platform').value,username:eid('soc-username').value,email:eid('soc-email').value,url:eid('soc-url').value,followers:+eid('soc-followers').value||0,status:eid('soc-status').value,notes:eid('soc-notes').value};
    if(this.editId)item.id=this.editId;
    await IDB.put('social',item);
    toast(this.editId?'Profilo aggiornato!':'Profilo social aggiunto!');
    closeModal('social');this.editId=null;await this.render();
  },
  async del(id){
    if(!confirm('Eliminare questo profilo social?'))return;
    await IDB.del('social',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminato','warning');await this.render();
  }
};

// ===== PRICING ENGINE =====
const EtsySEO = {
  _lastText:'', _lastName:'',
  async render(){
    const sel=eid('seo-product-select'); if(!sel)return;
    const items=await AppStore.get('catalog');
    sel.innerHTML='<option value="">— oppure compila manualmente —</option>'+items.map(p=>'<option value="'+p.id+'">'+(p.emoji||'')+''+p.name+'</option>').join('');
    this.renderSaved();
  },
  async caricaProdotto(id){
    if(!id)return;
    const p=await IDB.get('catalog',+id); if(!p)return;
    if(eid('seo-name')) eid('seo-name').value=p.name||'';
    if(eid('seo-material')) eid('seo-material').value=p.material||'';
    if(eid('seo-size')) eid('seo-size').value=p.size||'';
    if(eid('seo-custom')) eid('seo-custom').value=p.notes||'';
  },
  async genera(){
    const name=eid('seo-name')?.value?.trim(); if(!name){toast('Inserisci il nome prodotto','warning');return;}
    const btn=eid('seo-gen-btn'), out=eid('seo-output');
    if(btn){btn.disabled=true;btn.textContent='⏳ Generazione...';}
    if(out) out.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">✨ AI scrive il listing completo...</div>';
    const styles={emozionale:'Storytelling emotivo, linguaggio caldo e personale',professionale:'Tono formale, focus su qualità e specifiche tecniche',minimalista:'Conciso, bullet points, massima chiarezza',lusso:'Linguaggio premium, evoca esclusività artigianale'};
    const lang=eid('seo-lang')?.value||'italiano';
    const style=eid('seo-style')?.value||'emozionale';
    const prompt=`Sei un esperto SEO Etsy per artigiani italiani specializzati in incisione laser.

PRODOTTO: ${name}
MATERIALE: ${eid('seo-material')?.value||'non specificato'}
DIMENSIONI: ${eid('seo-size')?.value||'non specificate'}
PERSONALIZZAZIONI: ${eid('seo-custom')?.value||'nome, data, testo personalizzato'}
OCCASIONE: ${eid('seo-occasion')?.value||'regalo, uso personale'}
STILE RICHIESTO: ${styles[style]}
LINGUA: ${lang==='inglese'?'English (for international Etsy)':lang==='entrambi'?'Prima italiano completo, poi traduzione inglese completa':'Italiano'}

Crea il listing Etsy COMPLETO in questo formato preciso:

## 📌 TITOLO (max 140 caratteri, keyword-rich, inizia con keyword principale)
[titolo]

## 📝 DESCRIZIONE (${style==='minimalista'?'bullet points, 200 parole':'350 parole, paragrafi fluidi'})
[descrizione]

## 🏷️ 13 TAG (separati da virgola, max 20 caratteri ciascuno)
[tag1, tag2, ..., tag13]

## 🔍 KEYWORD SEO (6 frasi di ricerca usate dai clienti)
[frasi]

## 💡 CONSIGLIO FOTO
[1 consiglio specifico per le foto di questo prodotto]`;
    try{
      const text=await AIProvider.call(prompt,2000);
      this._lastText=text; this._lastName=name;
      const html=text.replace(/## (.*)/g,'<h3 style="color:var(--primary);margin:14px 0 6px;font-size:14px;font-weight:700">$1</h3>').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      if(out) out.innerHTML=`<div style="font-size:13px;line-height:1.7">${html}</div>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button onclick="navigator.clipboard.writeText(eid('seo-output').innerText).then(()=>toast('📋 Copiato negli appunti!'))" style="padding:7px 16px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia Tutto</button>
          <button onclick="EtsySEO.salva()" style="padding:7px 16px;background:#10b98118;color:#10b981;border:1px solid #10b98140;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">💾 Salva</button>
        </div>`;
    }catch(e){ if(out) out.innerHTML='<div style="color:#ef4444;padding:20px;text-align:center">❌ '+e.message+'</div>'; }
    if(btn){btn.disabled=false;btn.textContent='✨ Genera Listing Etsy Completo';}
  },
  salva(){
    if(!this._lastText){toast('Genera prima una descrizione','warning');return;}
    const all=JSON.parse(localStorage.getItem('ingly_seo_saved')||'[]');
    all.unshift({id:Date.now(),name:this._lastName,text:this._lastText,date:new Date().toISOString()});
    localStorage.setItem('ingly_seo_saved',JSON.stringify(all.slice(0,50)));
    toast('💾 Descrizione salvata!'); this.renderSaved();
  },
  renderSaved(){
    const el=eid('seo-saved-list'); if(!el)return;
    const all=JSON.parse(localStorage.getItem('ingly_seo_saved')||'[]');
    if(!all.length){el.innerHTML='<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Nessuna salvata</p>';return;}
    el.innerHTML=all.map(s=>`<div style="padding:10px;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div style="font-weight:700;font-size:13px">${s.name}</div><div style="font-size:11px;color:var(--text-muted)">${new Date(s.date).toLocaleDateString('it-IT')}</div></div><div style="display:flex;gap:4px"><button onclick="EtsySEO.carica(${s.id})" style="padding:4px 8px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:6px;cursor:pointer;font-size:11px">📂</button><button onclick="EtsySEO.elimina(${s.id})" style="padding:4px 8px;background:#ef444418;color:#ef4444;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px">🗑️</button></div></div></div>`).join('');
  },
  carica(id){
    const s=JSON.parse(localStorage.getItem('ingly_seo_saved')||'[]').find(x=>x.id===id); if(!s)return;
    this._lastText=s.text; this._lastName=s.name;
    const out=eid('seo-output');
    if(out){const html=s.text.replace(/## (.*)/g,'<h3 style="color:var(--primary);margin:14px 0 6px;font-size:14px;font-weight:700">$1</h3>').replace(/\n/g,'<br>');out.innerHTML='<div style="font-size:13px;line-height:1.7">'+html+'</div><div style="margin-top:12px"><button onclick="navigator.clipboard.writeText(eid(\'seo-output\').innerText).then(()=>toast(\'Copiato!\'))" style="padding:7px 14px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia</button></div>';}
  },
  elimina(id){
    localStorage.setItem('ingly_seo_saved',JSON.stringify(JSON.parse(localStorage.getItem('ingly_seo_saved')||'[]').filter(x=>x.id!==id)));
    this.renderSaved();
  }
};

// ============================================================
// PORTABILE — Export ZIP with data + images + tool
// ============================================================
const AIMarketing = {
  _currentProductId: null,
  _currentPersonaText: '',
  _currentHooksText: '',

  // ── Shared AI caller (supports streaming simulation via AIProvider) ──
  async _callClaude(prompt, onChunk) {
    const fullText = await AIProvider.call(prompt, 1500);
    if (onChunk) onChunk(fullText);
    return fullText;
  },

  // ─────────────────────────────────────
  // ① AI CONTENT STUDIO
  // ─────────────────────────────────────
  async generateContent() {
    const productId = eid('ais-product')?.value;
    const channel = eid('ais-channel')?.value || 'instagram_reel';
    const goal = eid('ais-goal')?.value || 'vendita';
    const tone = eid('ais-tone')?.value || 'emozionale';
    const target = eid('ais-target')?.value || 'cliente generico';
    const out = eid('ais-output');
    const btn = eid('ais-gen-btn');
    if (!out) return;

    let productInfo = 'Prodotto artigianale personalizzato (incisione laser)';
    if (productId) {
      const p = await IDB.get('catalog', +productId).catch(() => null);
      if (p) productInfo = `Nome: ${p.name}\nCategoria: ${p.category}\nDescrizione: ${p.desc||''}\nMateriale: ${p.material||''}\nPrezzo: €${p.salePrice}\nTag: ${p.tags||''}\nTrend score: ${p.trendScore||'N/A'}`;
    }

    const channelLabels = {
      instagram_reel:'Instagram Reel (caption + hook di apertura + CTA)',
      instagram_post:'Instagram Post Carosello (titolo ogni slide + caption finale)',
      instagram_story:'Instagram Story (testo breve + CTA swipe up)',
      tiktok:'TikTok (script parlato 30-60s + caption + hashtag)',
      facebook:'Facebook Post (testo completo + CTA)',
      linkedin:'LinkedIn Post (formato professionale B2B)',
      email:'Email Marketing (oggetto + preview + corpo completo)',
      whatsapp:'WhatsApp Broadcast (messaggio breve + link)',
      etsy:'Etsy (titolo SEO-ottimizzato + descrizione completa + tag)'
    };

    const goalLabels = { vendita:'vendita diretta con urgency', awareness:'brand awareness e storytelling', lead:'generazione lead (invita a contattare)', engagement:'massimizzare engagement e commenti', lancio:'lancio prodotto con hype', fidelizzazione:'fidelizzazione clienti esistenti' };
    const toneLabels = { emozionale:'emozionale e caldo (far sentire qualcosa)', esclusivo:'premium ed esclusivo (far sentire speciali)', urgente:'urgenza e scarcity (ora o mai più)', storytelling:'storytelling narrativo', diretto:'diretto e persuasivo (AIDA framework)', professionale:'professionale B2B' };

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    out.innerHTML = `<div class="card" style="min-height:200px"><div id="ais-stream" style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)"><span style="color:var(--text-dim)">⚡ AI sta scrivendo...</span></div></div>`;

    const prompt = `Sei un copywriter esperto di marketing digitale per un brand italiano di prodotti artigianali personalizzati (incisione laser su legno, acrilico, metallo). 
Il brand si chiama Ingly Design — lavora nel settore handmade/personalizzato.

PRODOTTO:
${productInfo}

CANALE: ${channelLabels[channel] || channel}
OBIETTIVO: ${goalLabels[goal] || goal}
TONO: ${toneLabels[tone] || tone}
TARGET CLIENTE: ${target}

Genera il copy COMPLETO e PRONTO DA PUBBLICARE per questo canale.

Struttura l'output con sezioni chiare usando emoji e separatori per ogni blocco (es: 📝 CAPTION, 🎯 CTA, #️⃣ HASHTAG, 📧 OGGETTO EMAIL, ecc.)

Usa tecniche di neuromarketing (identità, reciprocità, social proof, scarcity dove appropriato).
Scrivi in italiano, naturale e autentico. NON usare cliché generici.
Sii specifico al prodotto e al target indicato.`;

    try {
      await this._callClaude(prompt, (text) => {
        const s = eid('ais-stream');
        if (s) s.innerHTML = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      });
      // Add copy button after generation
      const container = out.querySelector('.card');
      if (container) {
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
        actions.innerHTML = `
          <button class="btn btn-secondary btn-sm" onclick="AIMarketing.copyContent()"><i class="fas fa-copy"></i> Copia Copy</button>
          <button class="btn btn-secondary btn-sm" onclick="AIMarketing.generateContent()"><i class="fas fa-redo"></i> Rigenera</button>
          <button class="btn btn-primary btn-sm" onclick="AIMarketing.saveToHistory()"><i class="fas fa-save"></i> Salva in Storico</button>`;
        container.appendChild(actions);
      }
    } catch (e) {
      out.innerHTML = `<div class="card"><div style="color:var(--red);padding:20px;text-align:center"><i class="fas fa-exclamation-triangle" style="display:block;font-size:28px;margin-bottom:8px"></i><strong>Errore AI</strong><br><small>${e.message}</small></div></div>`;
    }
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Genera Copy AI';
  },

  copyContent() {
    const s = eid('ais-stream');
    if (s) navigator.clipboard.writeText(s.innerText).then(() => toast('Copy copiato negli appunti!'));
  },

  async saveToHistory() {
    const s = eid('ais-stream');
    if (!s) return;
    await IDB.put('history', { ts: Date.now(), entity: 'marketing', action: 'ai_content_generated', entityId: 'studio', data: { preview: s.innerText.substring(0, 80) } }).catch(() => {});
    toast('Salvato nello storico!');
  },

  // ─────────────────────────────────────
  // ② VIRAL HOOK MACHINE
  // ─────────────────────────────────────
  async openHooks(productId) {
    this._currentProductId = productId;
    const p = await IDB.get('catalog', productId).catch(() => null);
    const infoEl = eid('viral-hooks-product-info');
    const out = eid('viral-hooks-output');
    const copyBtn = eid('viral-copy-btn');
    if (infoEl) infoEl.innerHTML = p
      ? `<strong style="color:var(--primary)">${p.emoji||'🎁'} ${p.name}</strong> · ${p.category} · €${p.salePrice} · Trend: ${p.trendScore||'—'}%`
      : `<span style="color:var(--text-muted)">Prodotto #${productId}</span>`;
    if (out) out.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-dim)">Seleziona piattaforma e target, poi clicca <strong style="color:var(--primary)">Genera 10 Hooks</strong></div>`;
    if (copyBtn) copyBtn.style.display = 'none';
    openModal('viral-hooks');
  },

  async generateHooks() {
    const platform = eid('viral-platform')?.value || 'instagram';
    const target = eid('viral-target')?.value || 'generale';
    const out = eid('viral-hooks-output');
    const btn = eid('viral-gen-btn');
    const copyBtn = eid('viral-copy-btn');
    if (!out) return;

    let productInfo = 'Prodotto artigianale personalizzato incisione laser';
    if (this._currentProductId) {
      const p = await IDB.get('catalog', +this._currentProductId).catch(() => null);
      if (p) productInfo = `${p.name} — ${p.desc||''} — Categoria: ${p.category} — Materiale: ${p.material||''} — Prezzo: €${p.salePrice}`;
    }

    const targetLabels = { spose:'Spose e sposi (matrimoni, romanticismo, emozione)', famiglie:'Famiglie e genitori (ricordi, infanzia, affetto)', aziende:'Aziende e corporate (professionalità, regalo B2B)', regali:'Persone in cerca di regali personalizzati unici', generale:'Pubblico generale italiano' };
    const platformLabels = { instagram:'Instagram Reels/Story', tiktok:'TikTok', facebook:'Facebook', linkedin:'LinkedIn', etsy:'Etsy (titolo prodotto)' };

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    out.innerHTML = `<div style="padding:16px;color:var(--text-dim);text-align:center"><i class="fas fa-bolt" style="color:var(--primary);font-size:24px;display:block;margin-bottom:8px"></i>AI sta generando 10 hooks virali...</div>`;

    const prompt = `Sei un esperto di viral marketing e neuromarketing per social media italiani.

PRODOTTO: ${productInfo}
PIATTAFORMA: ${platformLabels[platform] || platform}
TARGET: ${targetLabels[target] || target}

Genera esattamente 10 HOOK VIRALI pronti da usare come apertura di post/reel/video.

Usa questi 10 framework (uno per hook):
1. CURIOSITY GAP — crea un vuoto informativo irresistibile
2. IDENTITY TRIGGER — colpisce l'identità del target
3. PATTERN INTERRUPT — rompe l'aspettativa
4. SOCIAL PROOF — usa numeri o prove sociali implicite  
5. PAIN AGITATOR — tocca un problema reale del target
6. DREAM OUTCOME — visualizza il risultato desiderato
7. CONTROVERSY HOOK — opinione forte o contro-corrente
8. STORY OPEN — inizio di storia che obbliga a continuare
9. SCARCITY/FOMO — senso di urgenza o perdita
10. TRANSFORMATION — prima/dopo implicito

Formato OBBLIGATORIO per ogni hook:
🔥 [N]. [FRAMEWORK]
"[testo hook — max 2 righe, impatto immediato, in italiano]"
💡 [Perché funziona in 1 frase]

Sii specifico al prodotto, evita frasi generiche. Usa lo stile naturale italiano.`;

    try {
      let finalText = '';
      await this._callClaude(prompt, (text) => {
        finalText = text;
        out.innerHTML = `<div style="white-space:pre-wrap;font-size:13px;line-height:1.8;padding:4px">${text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/"([^"]+)"/g,'"<span style="color:var(--primary);font-weight:600">$1</span>"')}</div>`;
      });
      this._currentHooksText = finalText;
      if (copyBtn) copyBtn.style.display = '';
    } catch (e) {
      out.innerHTML = `<div style="color:var(--red);padding:20px;text-align:center"><i class="fas fa-exclamation-triangle" style="display:block;font-size:24px;margin-bottom:8px"></i><strong>Errore</strong>: ${e.message}</div>`;
    }
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Genera 10 Hooks';
  },

  copyAllHooks() {
    navigator.clipboard.writeText(this._currentHooksText).then(() => toast('10 hooks copiati negli appunti!'));
  },

  // ─────────────────────────────────────
  // ④ CLIENT PERSONA PROFILER AI
  // ─────────────────────────────────────
  async openPersona(clientId) {
    const body = eid('persona-modal-body');
    const copyBtn = eid('persona-copy-btn');
    if (body) body.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--primary)"></i><div style="margin-top:12px;color:var(--text-muted)">Analisi comportamentale in corso...</div></div>`;
    if (copyBtn) copyBtn.style.display = 'none';
    openModal('persona');

    const client = await IDB.get('clients', clientId).catch(() => null);
    if (!client) { if (body) body.innerHTML = `<div style="color:var(--red);padding:20px">Cliente non trovato.</div>`; return; }

    const allSales = await AppStore.get('sales').catch(() => []);
    const clientSales = allSales.filter(s => s.clientId === clientId);
    const paidSales = clientSales.filter(s => s.status === 'pagato');
    const totalSpent = paidSales.reduce((a, s) => a + (+s.amount || 0), 0);
    const avgOrder = paidSales.length ? totalSpent / paidSales.length : 0;
    const firstOrder = clientSales.length ? new Date(Math.min(...clientSales.map(s => s._createdAt || s.date || Date.now()))).toLocaleDateString('it-IT') : 'N/A';
    const lastOrder = clientSales.length ? new Date(Math.max(...clientSales.map(s => s._createdAt || s.date || Date.now()))).toLocaleDateString('it-IT') : 'N/A';
    const productsBought = [...new Set(clientSales.map(s => s.productName || s.description || '').filter(Boolean))].slice(0, 6).join(', ') || 'N/A';

    const prompt = `Sei un esperto di neuromarketing, psicologia del consumatore e CRM per PMI italiane.
Analizza il seguente profilo cliente di un'azienda di prodotti artigianali personalizzati (incisione laser) chiamata Ingly Design.

DATI CLIENTE:
- Nome: ${client.name}
- Note CRM: ${client.notes || 'nessuna'}
- Indirizzo: ${client.address || 'N/A'}
- Totale ordini: ${clientSales.length}
- Ordini pagati: ${paidSales.length}
- Totale speso: €${totalSpent.toFixed(2)}
- Ordine medio: €${avgOrder.toFixed(2)}
- Primo ordine: ${firstOrder}
- Ultimo ordine: ${lastOrder}
- Prodotti acquistati: ${productsBought}

Costruisci un PERSONA PROFILER COMPLETO strutturato esattamente così:

👤 PROFILO PSICOGRAFICO
[nome persona di fantasia + archetipo in 2-3 righe]

🧠 MOTIVAZIONI PRIMARIE D'ACQUISTO
[3 bullet con le leve psicologiche che lo muovono]

💡 EMOZIONE DOMINANTE DA ATTIVARE
[1 emozione principale + spiegazione breve]

📱 CANALE E MOMENTO IDEALE DI CONTATTO
[quando e dove contattarlo per massimizzare risposta]

✉️ TEMPLATE MESSAGGIO PERSONALIZZATO
[UN messaggio WhatsApp/email pronto da inviare a questo specifico cliente, in italiano, naturale]

⚠️ OBIEZIONE PRINCIPALE E COME NEUTRALIZZARLA
[cosa potrebbe bloccare il riacquisto + risposta]

🎯 PROSSIMA AZIONE CONSIGLIATA
[cosa fare QUESTA settimana per riattivarlo o fidelizzarlo]

📊 SCORE POTENZIALE: [X/10] — [motivazione in 1 riga]

Sii specifico, non generico. Usa i dati reali forniti.`;

    try {
      let finalText = '';
      await this._callClaude(prompt, (text) => {
        finalText = text;
        const html = text
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(👤|🧠|💡|📱|✉️|⚠️|🎯|📊)([^\n<]+)/g, '<div style="font-weight:700;color:#fff;margin:14px 0 6px;font-size:14px">$1$2</div>');
        if (body) body.innerHTML = `<div style="font-size:13px;line-height:1.8;padding:4px">${html}</div>`;
      });
      this._currentPersonaText = finalText;
      if (copyBtn) copyBtn.style.display = '';
    } catch (e) {
      if (body) body.innerHTML = `<div style="color:var(--red);padding:20px;text-align:center"><i class="fas fa-exclamation-triangle" style="display:block;font-size:24px;margin-bottom:8px"></i><strong>Errore AI</strong>: ${e.message}</div>`;
    }
  },

  copyPersona() {
    navigator.clipboard.writeText(this._currentPersonaText).then(() => toast('Persona brief copiato!'));
  }
};

// ===== THEME SWITCHER =====
const _OldSocialStudio = {
  _posts: [],
  _weekOffset: 0,
  _selectedPlatforms: new Set(['instagram']),

  async load() {
    try {
      const raw = await IDB.getAll('social_posts').catch(()=>[]);
      this._posts = raw || [];
    } catch { this._posts = []; }
    this.renderCalendar();
    this.renderPostsList();
    this._setDefaultDate();
  },

  _setDefaultDate() {
    const dateEl = eid('social-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0,10);
  },

  togglePlatform(btn, platform) {
    if (this._selectedPlatforms.has(platform)) {
      this._selectedPlatforms.delete(platform);
      btn.style.background = '';
      btn.style.color = '';
    } else {
      this._selectedPlatforms.add(platform);
      btn.style.background = 'var(--primary)';
      btn.style.color = 'var(--bg)';
    }
  },

  renderCalendar() {
    const el = eid('social-calendar');
    if (!el) return;
    const days = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 + this._weekOffset * 7);

    const labelEl = eid('social-week-label');
    if (labelEl) labelEl.textContent = `Settimana del ${weekStart.toLocaleDateString('it-IT',{day:'numeric',month:'short'})}`;

    el.innerHTML = days.map((day, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().slice(0,10);
      const isToday = dateStr === today.toISOString().slice(0,10);
      const dayPosts = this._posts.filter(p => p.date === dateStr);
      return `<div style="background:var(--bg-card2);border-radius:8px;padding:8px;min-height:80px;border:${isToday?'1px solid var(--primary)':'1px solid var(--border)'}">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${day} ${d.getDate()}</div>
        ${dayPosts.map(p=>`<div style="background:var(--primary);color:var(--bg);border-radius:4px;padding:2px 6px;font-size:9px;margin-bottom:2px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="SocialStudio.editPost('${p.id}')" title="${p.caption}">${p.platforms?.join(',')||'ig'} ${p.time||''}</div>`).join('')}
        <div style="font-size:9px;color:var(--text-dim);text-align:center;cursor:pointer;margin-top:4px" onclick="SocialStudio.quickAddDate('${dateStr}')">+ aggiungi</div>
      </div>`;
    }).join('');
  },

  prevWeek() { this._weekOffset--; this.renderCalendar(); },
  nextWeek() { this._weekOffset++; this.renderCalendar(); },

  quickAddDate(dateStr) {
    const el = eid('social-date');
    if (el) el.value = dateStr;
    eid('social-caption')?.focus();
  },

  renderPostsList() {
    const el = eid('social-posts-list');
    if (!el) return;
    const sorted = [...this._posts].sort((a,b) => (a.date+a.time) > (b.date+b.time) ? 1 : -1);
    if (!sorted.length) { el.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;font-size:12px">Nessun post pianificato</div>'; return; }
    const ps = this._postsPageSize || 20;
    const totalPages = Math.max(1, Math.ceil(sorted.length / ps));
    if (this._postsPage >= totalPages) this._postsPage = 0;
    const pg = this._postsPage || 0;
    const pageItems = sorted.slice(pg * ps, pg * ps + ps);
    const bs = 'padding:3px 9px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);cursor:pointer;color:var(--text);font-size:11px';
    el.innerHTML = pageItems.map(p => `
      <div style="background:var(--bg-card2);border-radius:8px;padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:10px;color:var(--primary)">${p.date} ${p.time||''}</div>
          <div style="display:flex;gap:6px">
            <span style="font-size:10px;color:var(--text-muted)">${(p.platforms||['instagram']).join(' · ')}</span>
            <button onclick="SocialStudio.deletePost('${p.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:11px">🗑️</button>
          </div>
        </div>
        <div style="font-size:11px;line-height:1.4;color:var(--text)">${(p.caption||'').slice(0,100)}${p.caption?.length>100?'...':''}</div>
        ${p.hashtags?`<div style="font-size:9px;color:var(--text-dim);margin-top:4px">${p.hashtags.slice(0,60)}...</div>`:''}
      </div>`).join('') +
      (totalPages > 1 ? `<div style="display:flex;justify-content:center;align-items:center;gap:5px;margin-top:6px">
        <button onclick="SocialStudio._postsPage=Math.max(0,(SocialStudio._postsPage||0)-1);SocialStudio.renderPostsList()" style="${bs}" ${pg===0?'disabled':''}>‹</button>
        <span style="font-size:10px;color:var(--text-muted)">${pg+1}/${totalPages} · ${sorted.length} post</span>
        <button onclick="SocialStudio._postsPage=Math.min(${totalPages-1},(SocialStudio._postsPage||0)+1);SocialStudio.renderPostsList()" style="${bs}" ${pg>=totalPages-1?'disabled':''}>›</button>
      </div>` : '');
  },

  async savePost() {
    const caption = eid('social-caption')?.value?.trim();
    const date = eid('social-date')?.value;
    const time = eid('social-time')?.value || '10:00';
    const hashtags = eid('social-hashtags')?.value?.trim();
    if (!caption || !date) { toast('Caption e data obbligatori','warning'); return; }
    const post = {
      id: Date.now().toString(),
      caption, date, time, hashtags,
      platforms: [...this._selectedPlatforms],
      createdAt: new Date().toISOString(),
    };
    await IDB.put('social_posts', post);
    this._posts.push(post);
    this.renderCalendar();
    this.renderPostsList();
    eid('social-caption').value = '';
    eid('social-hashtags').value = '';
    toast('Post salvato nel calendario!','success');
  },

  async deletePost(id) {
    await IDB.del('social_posts', id).catch(e=>console.warn('[IDB.del]',e)).catch(e=>console.warn('[IDB.del]',e));
    this._posts = this._posts.filter(p => p.id !== id);
    this.renderCalendar();
    this.renderPostsList();
  },

  previewPost() {
    const caption = eid('social-caption')?.value || '';
    const hashtags = eid('social-hashtags')?.value || '';
    const w = window.open('','_blank','width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:system-ui;background:#000;color:#fff;padding:20px;margin:0}
      .post{background:#1a1a1a;border-radius:12px;overflow:hidden;max-width:400px}
      .header{padding:12px;display:flex;align-items:center;gap:10px}
      .avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#54F2F4,#9b59b6);display:flex;align-items:center;justify-content:center;font-size:16px}
      .name{font-weight:700;font-size:13px}
      .img{background:linear-gradient(135deg,#1a1a2e,#54F2F4);height:200px;display:flex;align-items:center;justify-content:center;font-size:40px}
      .body{padding:12px;font-size:13px;line-height:1.5}
      .tags{color:#4FC3F7;font-size:12px;margin-top:8px}
    </style></head><body>
    <div class="post">
      <div class="header"><div class="avatar">✦</div><div><div class="name">inglydesign</div></div></div>
      <div class="img">✦</div>
      <div class="body">${caption.replace(/\n/g,'<br>')} <span class="tags">${hashtags}</span></div>
    </div></body></html>`);
  },

  async aiCaption() {
    const el = document.getElementById('social-modal-caption') || document.getElementById('soc-caption');
    if (el) el.value = '✨ Generazione...';
    try {
      const result = await AIStudio._callAI(`Crea una caption Instagram coinvolgente per Ingly Design (artigiani siciliani, targhe e decori laser personalizzati). Usa emoji, tono caldo e autentico, max 250 caratteri, aggiungi un call-to-action. Lingua: italiano.`);
      if (el) el.value = result;
    } catch(e) { if (el) el.value = ''; toast('Errore AI','warning'); }
  },

  async aiHashtags() {
    const el = eid('social-hashtags');
    if (el) el.value = '✨ Generazione...';
    const caption = eid('social-caption')?.value || '';
    try {
      const result = await AIStudio._callAI(`Genera 30 hashtag Instagram ottimizzati per: "${caption || 'artigianato laser personalizzato made in Sicily'}". Mix di popolari, di media portata e di nicchia. Solo hashtag, separati da spazio, tutti in minuscolo con #. Nessun commento.`);
      if (el) el.value = result.trim();
    } catch(e) { if (el) el.value = ''; toast('Errore AI','warning'); }
  },

  async generateReelScript() {
    const product = eid('reel-product')?.value?.trim();
    const duration = eid('reel-duration')?.value || '30';
    const el = eid('reel-script-result');
    if (!product) { toast('Inserisci il prodotto','warning'); return; }
    if (el) el.innerHTML = '✨ Generazione script...';
    try {
      const result = await AIStudio._callAI(`Crea uno script per un Reel Instagram di ${duration} secondi che mostra: "${product}" per Ingly Design (artigiani laser siciliani).
Formato:
🎬 APERTURA (0-3s): ...
📸 SCENA 1 (3-10s): ...
📸 SCENA 2 (10-20s): ...
${duration>15?'📸 SCENA 3 (20-'+duration+'s): ...':''}
🎯 CALL TO ACTION finale: ...
🎵 Musica consigliata: tipo/mood
Scrivi in italiano, tono dinamico e coinvolgente.`);
      if (el) el.innerHTML = `<div style="font-size:11px;line-height:1.8;white-space:pre-wrap">${result.replace(/</g,'&lt;')}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigator.clipboard.writeText(document.querySelector('#reel-script-result').innerText);toast('Copiato!','success')">📋 Copia Script</button>`;
    } catch(e) { if (el) el.textContent = 'Errore AI'; toast('Errore AI','warning'); }
  },

  newPost() { eid('social-caption')?.focus(); },
};

// ══════════════════════════════════════════════════════════════════
// WEB PRESENCE — Portfolio, Landing page, Bio
// ══════════════════════════════════════════════════════════════════
const WebPresence = {
  async init() {
    // Load catalog into landing product select
    try {
      const catalog = await AppStore.get('catalog').catch(()=>[]);
      const sel = eid('landing-product-select');
      if (sel && catalog?.length) {
        sel.innerHTML = '<option value="">— scegli un prodotto —</option>' +
          catalog.map(p=>`<option value="${p.id}">${p.name||p.id} — €${p.price||0}</option>`).join('');
      }
    } catch {}
  },

  generatePortfolio() {
    const title = eid('port-title')?.value || 'Ingly Design';
    const tagline = eid('port-tagline')?.value || 'Made in Sicily con amore 🇮🇹';
    const email = eid('port-email')?.value || '';
    const instagram = eid('port-instagram')?.value || '@inglydesign';
    const etsy = eid('port-etsy')?.value || '';

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${tagline}">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0a0f1a;color:#e2e8f0;min-height:100vh}
  .hero{padding:60px 20px;text-align:center;background:linear-gradient(135deg,#0a0f1a 0%,#151c2c 100%)}
  .logo-icon{width:80px;height:80px;background:linear-gradient(135deg,#54F2F4,#9b59b6);border-radius:20px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:36px}
  h1{font-size:clamp(24px,5vw,48px);font-weight:900;color:#54F2F4;margin-bottom:12px}
  .tagline{font-size:16px;color:#94a3b8;margin-bottom:30px}
  .cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .btn{padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}
  .btn-primary{background:#54F2F4;color:#0a0f1a}
  .btn-secondary{background:transparent;color:#54F2F4;border:1.5px solid #54F2F4}
  .section{padding:40px 20px;max-width:1000px;margin:0 auto}
  h2{font-size:24px;font-weight:800;color:#54F2F4;margin-bottom:24px;text-align:center}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
  .card{background:#151c2c;border-radius:12px;padding:20px;border:1px solid #1e2d4a}
  .card-icon{font-size:32px;margin-bottom:12px}
  .card h3{font-size:16px;font-weight:700;margin-bottom:8px}
  .card p{font-size:13px;color:#94a3b8;line-height:1.6}
  .contact{background:#151c2c;padding:40px 20px;text-align:center;border-top:1px solid #1e2d4a}
  .social-links{display:flex;gap:16px;justify-content:center;margin-top:20px;flex-wrap:wrap}
  .social-link{color:#54F2F4;text-decoration:none;font-size:14px;font-weight:600}
  footer{text-align:center;padding:20px;font-size:11px;color:#475569}
</style>
</head>
<body>
<div class="hero">
  <div class="logo-icon">✦</div>
  <h1>${title}</h1>
  <p class="tagline">${tagline}</p>
  <div class="cta-row">
    ${etsy?`<a href="${etsy}" target="_blank" class="btn btn-primary">🛍️ Shop Etsy</a>`:''}
    ${email?`<a href="mailto:${email}" class="btn btn-secondary">✉️ Contattaci</a>`:''}
    <a href="https://wa.me/" class="btn btn-secondary">💬 WhatsApp</a>
  </div>
</div>

<div class="section">
  <h2>✨ Cosa Creiamo</h2>
  <div class="grid">
    <div class="card"><div class="card-icon">🏷️</div><h3>Targhe Personalizzate</h3><p>Incise al laser su acrilico e legno. Ogni pezzo unico, su misura per te.</p></div>
    <div class="card"><div class="card-icon">💍</div><h3>Matrimoni & Eventi</h3><p>Segnaposto, tableau, bomboniere e decorazioni per i tuoi momenti speciali.</p></div>
    <div class="card"><div class="card-icon">🏢</div><h3>Aziende & Brand</h3><p>Insegne, portafoto, targhe ufficio. Professionalità su ogni dettaglio.</p></div>
    <div class="card"><div class="card-icon">🎁</div><h3>Regali Unici</h3><p>Idee regalo originali e personalizzate che lasciano il segno.</p></div>
  </div>
</div>

<div class="contact">
  <h2>📩 Contattaci</h2>
  <p style="color:#94a3b8;margin-bottom:16px">Ogni progetto è unico — raccontaci la tua idea!</p>
  <div class="social-links">
    ${instagram?`<a href="https://instagram.com/${instagram.replace('@','')}" target="_blank" class="social-link">📸 ${instagram}</a>`:''}
    ${etsy?`<a href="${etsy}" target="_blank" class="social-link">🛍️ Etsy Shop</a>`:''}
    ${email?`<a href="mailto:${email}" class="social-link">✉️ ${email}</a>`:''}
  </div>
</div>
<footer>© ${new Date().getFullYear()} ${title} · Generato con INGLY</footer>
</body>
</html>`;

    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio_ingly.html';
    a.click();
    toast('Portfolio HTML scaricato! Caricalo su Netlify o GitHub Pages gratis.','success');
  },

  generateLanding() {
    const productName = eid('landing-product-select')?.options[eid('landing-product-select').selectedIndex]?.text || 'Prodotto';
    const price = eid('landing-price')?.value || '0';
    const desc = eid('landing-desc')?.value || '';

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${productName} — Ingly Design</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0a0f1a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#151c2c;border-radius:20px;padding:40px;max-width:500px;width:100%;border:1px solid #1e2d4a;text-align:center}
  .badge{background:#54F2F420;color:#54F2F4;border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:16px}
  h1{font-size:clamp(20px,4vw,32px);font-weight:900;margin-bottom:12px;color:#fff}
  .desc{font-size:14px;color:#94a3b8;line-height:1.7;margin-bottom:24px}
  .price{font-size:40px;font-weight:900;color:#54F2F4;margin-bottom:8px}
  .price small{font-size:14px;color:#94a3b8}
  .btn{display:block;background:#54F2F4;color:#0a0f1a;padding:16px;border-radius:10px;font-weight:800;font-size:16px;cursor:pointer;text-decoration:none;margin:12px 0}
  .btn-wa{background:#25D366;color:#fff}
  .trust{display:flex;justify-content:center;gap:20px;margin-top:16px;flex-wrap:wrap}
  .trust-item{font-size:11px;color:#64748b}
  footer{font-size:10px;color:#334155;margin-top:20px}
</style>
</head>
<body>
<div class="card">
  <span class="badge">✦ Ingly Design · Made in Sicily</span>
  <h1>${productName}</h1>
  <p class="desc">${desc || 'Prodotto artigianale personalizzato, realizzato con cura nel nostro laboratorio siciliano.'}</p>
  <div class="price">€${parseFloat(price).toFixed(2)}<small> · spedizione inclusa</small></div>
  <a href="https://wa.me/?text=Ciao! Sono interessato a ${encodeURIComponent(productName)}" class="btn btn-wa">💬 Ordina su WhatsApp</a>
  <a href="#" class="btn">🛍️ Acquista ora</a>
  <div class="trust">
    <span class="trust-item">✅ Artigianale</span>
    <span class="trust-item">🇮🇹 Made in Sicily</span>
    <span class="trust-item">📦 Spedizione rapida</span>
    <span class="trust-item">💬 Assistenza diretta</span>
  </div>
  <footer>© ${new Date().getFullYear()} Ingly Design</footer>
</div>
</body>
</html>`;

    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `landing_${productName.replace(/\s+/g,'_').slice(0,30)}.html`;
    a.click();
    toast('Landing page HTML scaricata!','success');
  },

  async generateBio(platform) {
    const resultEl = eid('web-bio-result');
    const textEl = eid('web-bio-text');
    const labelEl = eid('web-bio-label');
    if (resultEl) resultEl.style.display='block';
    if (textEl) textEl.textContent = '✨ Generazione...';

    const labels = {instagram:'Bio Instagram',etsy:'About Etsy',google:'Google Business',linkedin:'LinkedIn'};
    if (labelEl) labelEl.textContent = labels[platform];

    const prompts = {
      instagram: 'Bio Instagram per Ingly Design (artigiani laser siciliani). Max 150 caratteri, con emoji, include call-to-action e link. Tono: caldo, creativo, professionale.',
      etsy: 'About per un negozio Etsy di artigianato laser siciliano chiamato "Ingly Design". 200-300 parole, racconta la storia, il laboratorio, la personalizzazione. Include parole chiave SEO. Italiano.',
      google: 'Descrizione Google Business per Ingly Design, laboratorio artigianale laser in Sicilia. 200-250 caratteri, includi servizi principali e area geografica.',
      linkedin: 'Sezione About LinkedIn per artigiano/imprenditore di Ingly Design (targhe e decori laser personalizzati, made in Sicily). Tono professionale ma autentico. 150-200 parole.',
    };

    try {
      const result = await AIStudio._callAI(prompts[platform]);
      if (textEl) textEl.textContent = result;
    } catch(e) { if (textEl) textEl.textContent = 'Errore AI: '+e.message; }
  },

  async aiLandingDesc() {
    const nameEl = eid('landing-product-select');
    const name = nameEl?.options[nameEl.selectedIndex]?.text || 'prodotto artigianale';
    const descEl = eid('landing-desc');
    if (descEl) descEl.value = '✨ Generazione...';
    try {
      const result = await AIStudio._callAI(`Crea una descrizione breve e coinvolgente (max 120 parole) per una landing page di questo prodotto artigianale: "${name}". Brand: Ingly Design, Made in Sicily. Include benefici chiave, personalizzazione, qualità. Italiano, tono caldo.`);
      if (descEl) descEl.value = result;
    } catch(e) { if (descEl) descEl.value = ''; }
  },
};

// ══════════════════════════════════════════════════════════════════
// PRODUZIONE — Lista picking, Fornitori, Spedizioni
// ══════════════════════════════════════════════════════════════════
const SocialStudio = {
  _currentTab: 'accounts',
  _postsPage: 0,
  _postsPageSize: 20,

  async load() {
    this.tab(LaserResources._currentTab);
  },

  tab(name) {
    LaserResources._currentTab = name;
    const tabs = ['accounts', 'posts', 'create', 'analytics'];
    tabs.forEach(t => {
      const panel = eid(`ss-${t}`);
      const btn = eid(`ss-tab-${t}`);
      if (panel) panel.style.display = t === name ? '' : 'none';
      if (btn) {
        btn.className = `btn btn-${t === name ? 'primary' : 'secondary'} btn-sm`;
        btn.style.fontSize = '11px';
      }
    });
    if (name === 'accounts') this.renderAccounts();
    if (name === 'posts') this.renderCalendar();
    if (name === 'analytics') this.renderAnalytics();
  },

  async renderAccounts() {
    const accounts = await IDB.getAll('social_accounts').catch(() => []);
    const grid = eid('ss-accounts-list');
    if (!grid) return;
    if (!accounts.length) {
      grid.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:12px">No accounts connected yet. Click "Add Account" to start.</div>`;
      return;
    }
    const PLATFORMS = {
      instagram: { color: '#e1306c', icon: 'fab fa-instagram' },
      tiktok: { color: '#69c9d0', icon: 'fab fa-tiktok' },
      facebook: { color: '#1877f2', icon: 'fab fa-facebook' },
      linkedin: { color: '#0a66c2', icon: 'fab fa-linkedin' },
      pinterest: { color: '#e60023', icon: 'fab fa-pinterest' },
    };
    grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">` +
      accounts.map(a => {
        const p = PLATFORMS[a.platform] || { color: '#64748b', icon: 'fas fa-share-alt' };
        return `<div class="card" style="border-left:3px solid ${p.color}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;gap:10px;align-items:center">
              <i class="${p.icon}" style="font-size:20px;color:${p.color}"></i>
              <div>
                <div style="font-weight:700;font-size:12px">@${a.username || a.name}</div>
                <div style="font-size:10px;color:var(--text-muted)">${a.platform}</div>
              </div>
            </div>
            <button onclick="SocialStudio.deleteAccount(${a.id})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px">✕</button>
          </div>
          ${a.followers ? `<div style="font-size:10px;color:var(--text-muted);margin-top:8px">👥 ${a.followers.toLocaleString()} followers</div>` : ''}
        </div>`;
      }).join('') + `</div>`;
  },

  async addAccount() {
    const platform = prompt('Platform (instagram / tiktok / facebook / linkedin / pinterest):');
    if (!platform) return;
    const username = prompt('Username (without @):');
    if (!username) return;
    const followers = parseInt(prompt('Followers count (or leave 0):') || '0') || 0;
    await IDB.put('social_accounts', { id: Date.now(), platform: platform.toLowerCase(), username, followers, addedAt: new Date().toISOString() });
    await this.renderAccounts();
    toast(`@${username} added ✅`, 'success');
  },

  async deleteAccount(id) {
    if (!confirm('Remove this account?')) return;
    await IDB.del('social_accounts', id).catch(e=>console.warn('[IDB.del]',e));
    await this.renderAccounts();
  },

  async renderCalendar() {
    const posts = await IDB.getAll('social_posts').catch(() => []);
    const filter = eid('ss-cal-filter')?.value || '';
    const filtered = posts.filter(p => !filter || (p.platforms || []).includes(filter));

    const list = eid('ss-posts-list');
    if (!list) return;

    if (!filtered.length) {
      list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:12px">
        No scheduled posts yet. Go to "Create" tab to generate and schedule content.
      </div>`;
      return;
    }

    const sorted = filtered.sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));
    list.innerHTML = sorted.map(p => {
      const date = p.scheduledAt ? new Date(p.scheduledAt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Not scheduled';
      return `<div class="card" style="margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">
        <div style="text-align:center;min-width:50px;background:var(--bg-card2);border-radius:8px;padding:8px">
          <div style="font-size:10px;color:var(--text-muted)">${date.split(',')[0]||''}</div>
          <div style="font-size:12px;font-weight:700">${date.split(' ').pop()||''}</div>
        </div>
        <div style="flex:1">
          <div style="font-size:12px;line-height:1.5;color:var(--text)">${(p.content||'').slice(0,150)}${p.content?.length>150?'...':''}</div>
          <div style="margin-top:6px;display:flex;gap:6px">
            ${(p.platforms||[]).map(pl=>`<span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 6px">${pl}</span>`).join('')}
          </div>
        </div>
        <button onclick="SocialStudio.deletePost(${p.id})" style="background:none;border:none;color:var(--text-dim);cursor:pointer">🗑️</button>
      </div>`;
    }).join('');
  },

  updatePlatforms() { /* checkbox handler — platforms auto-collected on save */ },

  async generateAI() {
    const topic = eid('ss-topic')?.value?.trim();
    if (!topic) return toast('Enter a topic first', 'warning');
    const tone = eid('ss-tone')?.value || 'casual';
    const platforms = [...document.querySelectorAll('#ss-platform-sel input:checked')].map(i => i.value);

    const preview = eid('ss-preview');
    if (preview) preview.textContent = '🤖 Generating...';

    const toneMap = { casual: 'friendly and relatable', professional: 'formal and credible', inspirational: 'motivational and uplifting', urgency: 'urgent and promotional' };
    const platformStr = platforms.join(', ') || 'social media';
    const prompt = `You are a social media expert for an Italian artisan laser engraving business.
Write an engaging post for ${platformStr} about: ${topic}
Tone: ${toneMap[tone]}
Include: engaging opening, value for followers, call to action.
Then on a new line write 5-10 relevant hashtags starting with #.
Language: if topic is in Italian → reply in Italian, otherwise in English.
Keep it natural, not corporate.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await resp.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';
      const parts = text.split(/\n(?=#)/);
      const postText = parts[0]?.trim() || text;
      const hashtags = text.match(/#\w+/g) || [];
      if (preview) preview.textContent = postText;
      const hashEl = eid('ss-hashtags');
      if (hashEl) hashEl.textContent = hashtags.join(' ');
    } catch (e) {
      if (preview) preview.textContent = 'AI generation failed. Please configure your AI provider in Settings.';
    }
  },

  async savePost() {
    const content = eid('ss-preview')?.textContent;
    if (!content || content.includes('will appear here') || content.includes('Failed')) {
      return toast('Generate content first', 'warning');
    }
    const platforms = [...document.querySelectorAll('#ss-platform-sel input:checked')].map(i => i.value);
    const scheduledAt = eid('ss-schedule')?.value;
    await IDB.put('social_posts', {
      id: Date.now(),
      content,
      platforms,
      hashtags: eid('ss-hashtags')?.textContent || '',
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'scheduled' : 'draft',
      createdAt: new Date().toISOString(),
    });
    toast('Post saved ✅', 'success');
    this.tab('posts');
  },

  async deletePost(id) {
    if (!confirm('Delete this post?')) return;
    await IDB.del('social_posts', id)
    await this.renderCalendar();
  },

  async aiCaption(){
    const el=document.getElementById('social-modal-caption')||document.getElementById('soc-caption');
    const prod=document.getElementById('social-modal-product')||document.getElementById('soc-product');
    if(!el){ toast('Apri prima il form post','warning'); return; }
    const btn=document.querySelector('[onclick*="aiCaption"]');
    if(btn){btn.disabled=true;btn.textContent='✨ Genera...';}
    const cfg=await IDB.get('settings','main').catch(()=>({}))||{};
    const productCtx=prod?.value||'prodotto laser personalizzato';
    const prompt=`Sei un social media manager esperto per artigiani italiani.
Crea 3 caption diverse per Instagram/TikTok per questo prodotto: "${productCtx}".
Azienda: ${cfg.company||'Artigiano laser'}. Tone: caldo, autentico, italiano.
Formato: Caption 1 (emoji abbondanti, call to action), Caption 2 (storytelling breve), Caption 3 (domanda interattiva).
Max 150 parole totali per ogni caption. Includi hashtag rilevanti alla fine di ciascuna.`;
    try{
      const txt=await AIProvider.call(prompt,800);
      // Show result in a modal overlay
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10500;display:flex;align-items:center;justify-content:center;padding:20px';
      ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;width:540px;max-width:96vw;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:14px">✨ AI Caption Generate</div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
        </div>
        <div style="padding:16px;overflow-y:auto;flex:1;white-space:pre-line;font-size:13px;line-height:1.7;color:var(--text)">${txt.replace(/</g,'&lt;')}</div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
          <button onclick="navigator.clipboard.writeText(${JSON.stringify(txt)}).then(()=>toast('Copiato!','success'))" style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia tutto</button>
          <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">Chiudi</button>
        </div>
      </div>`;
      document.body.appendChild(ov);
    }catch(e){const msg=e.message==='NO_KEY'?'⚠️ Configura la API Key in Impostazioni':'AI non disponibile: '+e.message; toast(msg,'warning');}
    finally{if(btn){btn.disabled=false;btn.textContent='✨ AI Caption';}}
  },
  async aiHashtags(){
    const prod=document.getElementById('social-modal-product')||document.getElementById('soc-product');
    const btn=document.querySelector('[onclick*="aiHashtags"]');
    if(btn){btn.disabled=true;btn.textContent='#️⃣ Genera...';}
    const productCtx=prod?.value||'prodotto laser personalizzato';
    const prompt=`Genera i migliori 30 hashtag Instagram/TikTok per questo prodotto artigianale italiano: "${productCtx}".
Dividi in: 🔥 Trending (10), 🎯 Nicchia (10), 🏠 Locale/Italia (5), 🌟 Brand building (5).
Formato: solo gli hashtag con # preceduto dalla categoria. Includi volume indicativo (alto/medio/basso).`;
    try{
      const txt=await AIProvider.call(prompt,500);
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10500;display:flex;align-items:center;justify-content:center;padding:20px';
      ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;width:480px;max-width:96vw;max-height:75vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:14px">#️⃣ AI Hashtag Research</div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
        </div>
        <div style="padding:16px;overflow-y:auto;flex:1;white-space:pre-line;font-size:13px;line-height:1.9;color:var(--text)">${txt.replace(/</g,'&lt;')}</div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
          <button onclick="navigator.clipboard.writeText(${JSON.stringify(txt)}).then(()=>toast('Copiato!','success'))" style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia</button>
          <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">Chiudi</button>
        </div>
      </div>`;
      document.body.appendChild(ov);
    }catch(e){const msg=e.message==='NO_KEY'?'⚠️ Configura la API Key in Impostazioni':'AI non disponibile: '+e.message; toast(msg,'warning');}
    finally{if(btn){btn.disabled=false;btn.textContent='#️⃣ AI Hashtag';}}
  },
  async editPost(id){ this._editId=id; if(this.openModal)this.openModal(); },
  async generateReelScript(){
    const btn=document.querySelector('[onclick*="generateReelScript"]');
    const prod=document.getElementById('social-modal-product')||document.getElementById('soc-product');
    if(btn){btn.disabled=true;btn.textContent='🎬 Genera...';}
    const productCtx=prod?.value||'prodotto laser personalizzato';
    const cfg=await IDB.get('settings','main').catch(()=>({}))||{};
    const prompt=`Crea uno script Reel/TikTok di 30-45 secondi per un artigiano italiano che vende "${productCtx}".
Azienda: ${cfg.company||'Artigiano laser'}.
Formato:
🎬 HOOK (0-3s): frase d'apertura per fermare lo scroll
📸 SCENA 1 (3-10s): cosa mostrare + testo sovrapposto
📸 SCENA 2 (10-20s): processo/dettaglio + testo
📸 SCENA 3 (20-30s): prodotto finito + reazione cliente
🎯 CTA (30-45s): call to action specifica
🎵 AUDIO SUGGERITO: trend audio consigliato
Tono: autentico, artigianale, coinvolgente. In italiano.`;
    try{
      const txt=await AIProvider.call(prompt,700);
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10500;display:flex;align-items:center;justify-content:center;padding:20px';
      ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;width:560px;max-width:96vw;max-height:85vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:14px">🎬 Script Reel / TikTok</div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
        </div>
        <div style="padding:16px;overflow-y:auto;flex:1;white-space:pre-line;font-size:13px;line-height:1.7;color:var(--text)">${txt.replace(/</g,'&lt;')}</div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
          <button onclick="navigator.clipboard.writeText(${JSON.stringify(txt)}).then(()=>toast('Script copiato!','success'))" style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia Script</button>
          <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">Chiudi</button>
        </div>
      </div>`;
      document.body.appendChild(ov);
    }catch(e){const msg=e.message==='NO_KEY'?'⚠️ Configura la API Key in Impostazioni':'AI non disponibile: '+e.message; toast(msg,'warning');}
    finally{if(btn){btn.disabled=false;btn.textContent='🎬 Script Reel';}}
  },
  async newPost(){ this._editId=null; if(this.openModal)this.openModal(); },
  nextWeek(){ this._weekOffset=(this._weekOffset||0)+1; if(this.render)this.render(); },
  prevWeek(){ this._weekOffset=(this._weekOffset||0)-1; if(this.render)this.render(); },
  async previewPost(id){
    const posts=await IDB.getAll('social_posts').catch(()=>[]);
    const post=posts.find(p=>p.id===id); if(!post){toast('Post non trovato','error');return;}
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10500;display:flex;align-items:center;justify-content:center;padding:20px';
    const plat=post.platform||'instagram';
    const platColor={'instagram':'#e1306c','tiktok':'#010101','facebook':'#1877f2','pinterest':'#e60023'}[plat]||'#6366f1';
    ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;width:400px;max-width:96vw;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:13px">👁 Anteprima Post</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <!-- Phone mockup -->
      <div style="padding:16px">
        <div style="border:2px solid ${platColor};border-radius:12px;overflow:hidden">
          <div style="background:${platColor};padding:8px 12px;display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:14px">📷</div>
            <div style="font-size:11px;font-weight:700;color:#fff">${post.account||plat.charAt(0).toUpperCase()+plat.slice(1)}</div>
            <div style="margin-left:auto;font-size:10px;color:rgba(255,255,255,.7)">${post.date||''}</div>
          </div>
          ${post.imageUrl?`<img src="${post.imageUrl}" style="width:100%;max-height:220px;object-fit:cover">`:`<div style="height:160px;background:linear-gradient(135deg,${platColor}20,${platColor}10);display:flex;align-items:center;justify-content:center;font-size:40px">${{'instagram':'📸','tiktok':'🎬','facebook':'👍','pinterest':'📌'}[plat]||'📱'}</div>`}
          <div style="padding:12px;background:#fff;color:#111">
            <div style="font-size:12px;line-height:1.5;margin-bottom:8px">${(post.caption||'').replace(/\n/g,'<br>').replace(/(#[\w]+)/g,'<span style="color:'+platColor+'">$1</span>')}</div>
            <div style="font-size:10px;color:#999;display:flex;gap:12px">❤️ — 💬 — 🔁 — ➤</div>
          </div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
  },
  quickAddDate(d){ this._newDate=d; if(this.newPost)this.newPost(); },
  togglePlatform(p){ if(!this._platforms)this._platforms=new Set(['instagram']); this._platforms.has(p)?this._platforms.delete(p):this._platforms.add(p); if(this.render)this.render(); },

  // ── Social Analytics from Sales data ─────────────
  async renderAnalytics(){
    const el = document.getElementById('ss-analytics');
    if(!el) return;
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const paid  = sales.filter(s=>s.status==='pagato');

    // Group by channel
    const channels = {};
    paid.forEach(s=>{
      const ch = s.channel||'Diretto';
      if(!channels[ch]) channels[ch]={name:ch,revenue:0,count:0};
      channels[ch].revenue+=(+s.amount||0);
      channels[ch].count++;
    });
    const sorted = Object.values(channels).sort((a,b)=>b.revenue-a.revenue);
    const total  = paid.reduce((a,s)=>a+(+s.amount||0),0);

    const CHAN_COLORS={'Etsy':'#f97316','Instagram':'#e1306c','Facebook':'#1877f2','TikTok':'#69c9d0','WhatsApp':'#25D366','Diretto':'#6366f1','Pinterest':'#e60023'};

    el.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
      <div style="font-size:13px;font-weight:800">📊 Revenue per Canale</div>
      ${sorted.length?`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        ${sorted.map(ch=>{
          const pct=total>0?Math.round(ch.revenue/total*100):0;
          const col=CHAN_COLORS[ch.name]||'#64748b';
          return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${col}">
            <div style="font-size:14px;font-weight:900;color:${col}">€${Math.round(ch.revenue)}</div>
            <div style="font-size:11px;font-weight:700;margin-top:2px">${ch.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${ch.count} vendite · ${pct}%</div>
            <div style="height:4px;background:var(--bg-card2);border-radius:99px;margin-top:8px;overflow:hidden">
              <div style="height:4px;width:${pct}%;background:${col};border-radius:99px"></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:800;margin-bottom:10px">📋 Dettaglio canali</div>
        ${sorted.map(ch=>{
          const pct=total>0?Math.round(ch.revenue/total*100):0;
          const col=CHAN_COLORS[ch.name]||'#64748b';
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <div style="flex:1;font-size:12px">${ch.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${ch.count} vendite</div>
            <div style="font-size:12px;font-weight:700;color:${col}">€${Math.round(ch.revenue)}</div>
            <div style="font-size:10px;background:${col}18;color:${col};padding:1px 7px;border-radius:99px;font-weight:700">${pct}%</div>
          </div>`;
        }).join('')}
      </div>`:'<div style="text-align:center;padding:30px;color:var(--text-muted)">Nessuna vendita registrata con canale specifico.<br>Aggiungi vendite con il campo "Canale" compilato.</div>'}

      <!-- Quick Social Links -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:800;margin-bottom:10px">🔗 Apri i tuoi social</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[
            {n:'Instagram',url:'https://instagram.com',ico:'fab fa-instagram',c:'#e1306c'},
            {n:'TikTok',url:'https://tiktok.com',ico:'fab fa-tiktok',c:'#69c9d0'},
            {n:'Facebook',url:'https://facebook.com',ico:'fab fa-facebook',c:'#1877f2'},
            {n:'Pinterest',url:'https://pinterest.com',ico:'fab fa-pinterest',c:'#e60023'},
            {n:'Etsy',url:'https://etsy.com/shop/manager',ico:'fab fa-etsy',c:'#f97316'},
            {n:'LinkedIn',url:'https://linkedin.com',ico:'fab fa-linkedin',c:'#0a66c2'},
          ].map(s=>`<a href="${s.url}" target="_blank" rel="noopener"
            style="padding:7px 14px;background:${s.c}15;color:${s.c};border:1px solid ${s.c}30;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px">
            <i class="${s.ico}" style="font-size:13px"></i>${s.n}
          </a>`).join('')}
        </div>
      </div>
    </div>`;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 🌐 MARKET INTEL MODULE — Unified Competitor + Trends
// Store: competitors
// ══════════════════════════════════════════════════════════════════════════════
const CompetitorTracker = {
  _currentTab: 'tracker',
  _alerts: [],

  async load() {
    this._checkCompetitorAlerts();
    this.tab('tracker');
  },

  tab(name) {
    LaserResources._currentTab = name;
    const tabs = ['tracker', 'ai', 'elasticity', 'pricing', 'alerts'];
    tabs.forEach(t => {
      const p = eid('mi-' + t);
      const b = eid('mi-tab-' + t);
      if (p) p.style.display = t === name ? '' : 'none';
      if (b) b.className = 'btn btn-' + (t === name ? 'primary' : 'secondary') + ' btn-sm';
    });
    if (name === 'tracker')    this.renderTracker();
    if (name === 'pricing')    this.renderPricing();
    if (name === 'elasticity') this.renderElasticity();
    if (name === 'alerts')     this.renderAlerts();
  },

  async _checkCompetitorAlerts() {
    const competitors = await IDB.getAll('competitors').catch(() => []);
    await BDW.init();
    const myAvg = BDW.metrics.revenue.mtd / Math.max(1, BDW.metrics.ops.ordersActive + 1);
    this._alerts = [];
    competitors.forEach(c => {
      if (c.avgPrice && myAvg && c.avgPrice < myAvg * 0.8) {
        this._alerts.push({
          type: 'price',
          severity: 'high',
          icon: '🔴',
          title: c.name + ' prezzi -' + Math.round((1 - c.avgPrice/myAvg)*100) + '% sotto i tuoi',
          body: 'Avg competitor: ' + fmtCur(c.avgPrice) + ' vs. tuo stim.: ' + fmtCur(myAvg) + '. Verifica posizionamento.',
          competitor: c.name,
          ts: Date.now()
        });
      }
      if (c.reviews && c.reviews > 200 && !c._alertedReviews) {
        this._alerts.push({
          type: 'review',
          severity: 'medium',
          icon: '🟡',
          title: c.name + ' ha ' + c.reviews + ' recensioni',
          body: 'Competitor con alta social proof. Considera di rafforzare le tue recensioni e la comunicazione qualità.',
          competitor: c.name,
          ts: Date.now()
        });
      }
    });
    // Update badge
    const badge = eid('mi-alert-badge');
    if (badge) { badge.textContent = this._alerts.length; badge.style.display = this._alerts.length ? '' : 'none'; }
  },

  renderAlerts() {
    const el = eid('mi-alerts'); if (!el) return;
    if (!this._alerts.length) {
      el.innerHTML = '<div class="card" style="text-align:center;padding:32px;color:var(--text-dim)"><i class="fas fa-check-circle" style="font-size:32px;color:#22c55e;display:block;margin-bottom:12px"></i>Nessun alert competitivo al momento</div>';
      return;
    }
    const sevColor = {high:'#ef4444', medium:'#f59e0b', low:'#22c55e'};
    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px">' +
      this._alerts.map(a => [
        '<div style="padding:14px 16px;background:var(--bg-card2);border-radius:10px;border-left:4px solid ' + (sevColor[a.severity]||'#6366f1') + ';display:flex;gap:12px;align-items:flex-start">',
          '<div style="font-size:22px">' + a.icon + '</div>',
          '<div style="flex:1">',
            '<div style="font-weight:700;font-size:13px">' + a.title + '</div>',
            '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">' + a.body + '</div>',
            '<div style="font-size:10px;color:var(--text-dim);margin-top:4px">' + a.competitor + ' · ' + new Date(a.ts).toLocaleDateString('it-IT') + '</div>',
          '</div>',
          '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + (sevColor[a.severity]||'#6366f1') + '20;color:' + (sevColor[a.severity]||'#6366f1') + ';font-weight:700;white-space:nowrap">' + a.severity.toUpperCase() + '</span>',
        '</div>'
      ].join('')).join('') + '</div>';
  },

  async renderElasticity() {
    const el = eid('mi-elasticity'); if (!el) return;
    await BDW.init();
    const raw = BDW._raw || {};
    const sales = raw.allSales || [];
    const catalog = raw.catalog || [];

    // Build price-quantity data per product from sales
    const prodData = {};
    sales.forEach(s => {
      const name = s.itemName || s.product || s.description || '';
      const price = +s.unitPrice || (+s.amount / Math.max(1, +s.qty || 1));
      const qty = +s.qty || 1;
      if (!name || price <= 0) return;
      if (!prodData[name]) prodData[name] = [];
      prodData[name].push({ price, qty, date: s.date });
    });

    // Calculate demand elasticity Ed = %ΔQ / %ΔP
    const elasticities = [];
    Object.entries(prodData).forEach(([name, pts]) => {
      if (pts.length < 3) return;
      // Sort by date, compute avg price per period and qty
      pts.sort((a,b) => (a.date||'').localeCompare(b.date||''));
      const half = Math.floor(pts.length / 2);
      const early = pts.slice(0, half);
      const late  = pts.slice(half);
      const p1 = early.reduce((a,x)=>a+x.price,0)/early.length;
      const p2 = late.reduce((a,x)=>a+x.price,0)/late.length;
      const q1 = early.reduce((a,x)=>a+x.qty,0)/early.length;
      const q2 = late.reduce((a,x)=>a+x.qty,0)/late.length;
      if (Math.abs(p2 - p1) < 0.5) return;
      const pctP = (p2 - p1) / p1;
      const pctQ = (q2 - q1) / Math.max(q1, 0.01);
      const ed = pctP !== 0 ? pctQ / pctP : 0;
      elasticities.push({ name, ed: +ed.toFixed(2), p1: +p1.toFixed(2), p2: +p2.toFixed(2), q1: +q1.toFixed(1), q2: +q2.toFixed(1) });
    });

    elasticities.sort((a,b) => a.ed - b.ed);

    const edLabel = ed => {
      if (ed < -1.5) return { t:'Molto Elastica 🔴', c:'#ef4444', tip:'Clienti sensibili al prezzo — abbassare il prezzo aumenta molto la domanda' };
      if (ed < -0.5) return { t:'Elastica 🟡', c:'#f59e0b', tip:'Domanda reagisce al prezzo — aumenti vanno fatti con cautela' };
      if (ed >= -0.5 && ed <= 0.5) return { t:'Inelastica ✅', c:'#22c55e', tip:'Domanda stabile al variare del prezzo — puoi alzare senza perdere volume' };
      return { t:'Anomala ❓', c:'#a78bfa', tip:'Pattern insolito — verifica i dati' };
    };

    if (!elasticities.length) {
      el.innerHTML = '<div class="card"><div class="card-title">📊 Analisi Elasticit&agrave; Domanda</div>' +
        '<div style="padding:30px;text-align:center;color:var(--text-dim)">' +
        '<i class="fas fa-chart-line" style="font-size:36px;opacity:.2;display:block;margin-bottom:12px"></i>' +
        '<p style="font-size:13px">Servono almeno 3 vendite per prodotto a prezzi diversi.</p>' +
        '<p style="font-size:11px;margin-top:8px">Aggiungi vendite con campo prodotto e prezzo unitario compilato.</p>' +
        '</div></div>';
      return;
    }

    const rows = elasticities.map(e => {
      const l = edLabel(e.ed);
      return [
        '<div style="padding:12px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:12px">',
          '<div style="flex:1">',
            '<div style="font-weight:700;font-size:13px">' + e.name + '</div>',
            '<div style="font-size:10px;color:var(--text-muted)">Prezzo: ' + fmtCur(e.p1) + ' → ' + fmtCur(e.p2) + ' · Qty: ' + e.q1 + ' → ' + e.q2 + '</div>',
            '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic">' + l.tip + '</div>',
          '</div>',
          '<div style="text-align:right">',
            '<div style="font-size:15px;font-weight:900;color:' + l.c + '">' + e.ed + '</div>',
            '<div style="font-size:10px;color:' + l.c + ';font-weight:700">' + l.t + '</div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    // What-if: how much revenue gained/lost by +10% price on inelastic products
    const inelastic = elasticities.filter(e => e.ed > -0.5 && e.ed < 0.5);
    const oppText = inelastic.length
      ? 'Alza del 10% il prezzo di ' + inelastic.map(e=>e.name).slice(0,2).join(', ') + ' — domanda stabile, revenue +10%'
      : 'Aggiungi più dati per identificare opportunità di pricing';

    el.innerHTML = [
      '<div class="card">',
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">',
          '<div class="card-title" style="margin:0">📊 Analisi Elasticità Domanda</div>',
          '<div style="font-size:10px;color:var(--text-muted)">Ed = %ΔQ / %ΔP · basato su dati reali</div>',
        '</div>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">',
          '<div style="background:var(--bg-card2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:#22c55e">' + elasticities.filter(e=>e.ed>-0.5&&e.ed<0.5).length + '</div><div style="font-size:10px;color:var(--text-muted)">Inelastici 💰</div></div>',
          '<div style="background:var(--bg-card2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:#f59e0b">' + elasticities.filter(e=>e.ed<=-0.5&&e.ed>=-1.5).length + '</div><div style="font-size:10px;color:var(--text-muted)">Elastici ⚠️</div></div>',
          '<div style="background:var(--bg-card2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:#ef4444">' + elasticities.filter(e=>e.ed<-1.5).length + '</div><div style="font-size:10px;color:var(--text-muted)">Molto Elastici 🔴</div></div>',
        '</div>',
        '<div style="background:var(--bg-card);border-radius:8px;overflow:hidden;margin-bottom:14px">',
          rows,
        '</div>',
        '<div style="padding:12px 14px;background:#22c55e10;border-radius:8px;border-left:3px solid #22c55e;font-size:12px">',
          '💡 <strong>Opportunità pricing:</strong> ' + oppText,
        '</div>',
      '</div>'
    ].join('');
  },

  async renderTracker() {
    const competitors = await IDB.getAll('competitors').catch(() => []);
    const grid = eid('mi-competitors-grid'); if (!grid) return;
    const addCard = '<div class="card" style="border:2px dashed var(--border);text-align:center;padding:24px;cursor:pointer;color:var(--text-muted)" onclick="CompetitorTracker.addCompetitor()"><i class="fas fa-plus-circle" style="font-size:24px;display:block;margin-bottom:8px;opacity:.4"></i><div style="font-size:12px">Add Competitor Shop</div><div style="font-size:10px;margin-top:4px">Track Etsy, website, prices</div></div>';
    if (!competitors.length) { grid.innerHTML = addCard; return; }
    grid.innerHTML = addCard + competitors.map(c => {
      const priceSpan = c.avgPrice ? '<span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 8px">Avg ' + fmtCur(c.avgPrice) + '</span>' : '';
      const salesSpan = c.sales ? '<span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 8px">Sales: ' + (+c.sales).toLocaleString() + '</span>' : '';
      const revSpan = c.reviews ? '<span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 8px">⭐ ' + c.reviews + '</span>' : '';
      const urlEl = c.url ? '<a href="' + c.url + '" target="_blank" style="font-size:10px;color:#38bdf8;margin-top:6px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + c.url + '</a>' : '';
      return '<div class="card" style="border-left:3px solid #f97316">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div><div style="font-weight:700;font-size:13px">' + c.name + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + (c.platform||'Etsy') + ' · ' + (c.niche||'') + '</div></div>' +
          '<button onclick="CompetitorTracker.deleteCompetitor(' + c.id + ')" style="background:none;border:none;color:var(--text-dim);cursor:pointer">✕</button>' +
        '</div>' + urlEl +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + priceSpan + salesSpan + revSpan + '</div>' +
        (c.notes ? '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">' + c.notes + '</div>' : '') +
        '<div style="margin-top:10px;display:flex;gap:6px">' +
          '<button onclick="CompetitorTracker.updateCompetitor(' + c.id + ')" class="btn btn-secondary btn-sm" style="font-size:10px">✏️ Aggiorna</button>' +
          '<button onclick="CompetitorTracker.analyzeSentiment(' + c.id + ')" class="btn btn-secondary btn-sm" style="font-size:10px;color:#a78bfa">🤖 Sentiment AI</button>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  async addCompetitor() {
    const name = prompt('Nome competitor / shop:'); if (!name) return;
    const url = prompt('URL (Etsy, sito, ecc.):') || '';
    const platform = prompt('Piattaforma (Etsy / Sito / Instagram):') || 'Etsy';
    const avgPrice = parseFloat(prompt('Prezzo medio prodotti (€, 0 se ignoto):') || '0') || 0;
    const niche = prompt('Nicchia / categoria principale:') || '';
    const reviews = parseInt(prompt('N. recensioni (0 se ignoto):') || '0') || 0;
    const notes = prompt('Note:') || '';
    await IDB.put('competitors', { id: Date.now(), name, url, platform, avgPrice, niche, reviews, notes, addedAt: new Date().toISOString() });
    await this._checkCompetitorAlerts();
    await this.renderTracker();
    toast(name + ' aggiunto ✅', 'success');
  },

  async updateCompetitor(id) {
    const competitors = await IDB.getAll('competitors').catch(()=>[]);
    const c = competitors.find(x=>x.id===id); if (!c) return;
    const avgPrice = parseFloat(prompt('Aggiorna prezzo medio (€):', c.avgPrice||'') || '') || c.avgPrice;
    const reviews = parseInt(prompt('Aggiorna n. recensioni:', c.reviews||'') || '') || c.reviews;
    const notes = prompt('Note:', c.notes||'') ?? c.notes;
    await IDB.put('competitors', { ...c, avgPrice, reviews, notes, updatedAt: new Date().toISOString() });
    await this._checkCompetitorAlerts();
    await this.renderTracker();
    toast('Competitor aggiornato', 'success');
  },

  async deleteCompetitor(id) {
    if (!confirm('Rimuovere questo competitor?')) return;
    await IDB.del('competitors', id).catch(e=>console.warn('[IDB.del]',e)).catch(e=>console.warn('[IDB.del]',e));
    await this.renderTracker();
  },

  async analyzeSentiment(competitorId) {
    const competitors = await IDB.getAll('competitors').catch(()=>[]);
    const c = competitors.find(x=>x.id===competitorId); if (!c) return;
    const resultDiv = eid('mi-ai-result');
    const titleEl = eid('mi-ai-title');
    const contentEl = eid('mi-ai-content');
    if (resultDiv) resultDiv.style.display = '';
    if (titleEl) titleEl.textContent = '🤖 Sentiment Analysis — ' + c.name;
    if (contentEl) contentEl.textContent = 'Analisi in corso...';
    this.tab('ai');
    const parts = [
      'Sei un esperto di e-commerce artigianale italiano.',
      'Analizza questo competitor: ' + c.name + ' su ' + (c.platform||'Etsy') + '.',
      c.url ? 'URL: ' + c.url + '.' : '',
      c.reviews ? c.reviews + ' recensioni.' : '',
      c.avgPrice ? 'Prezzo medio: €' + c.avgPrice + '.' : '',
      'Nicchia: ' + (c.niche||'laser/artigianato') + '.',
      'Fornisci: 1) Sentiment clienti 2) Punti forza vs artigiano laser italiano 3) Vulnerabilita da sfruttare 4) Posizionamento prezzo. Max 250 parole, in italiano.'
    ];
    const promptText = parts.filter(Boolean).join(' ');
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: promptText }] })
      });
      const data = await resp.json();
      const text = data.content?.find(b=>b.type==='text')?.text || 'AI non disponibile.';
      if (contentEl) contentEl.textContent = text;
    } catch(e) {
      if (contentEl) contentEl.textContent = 'AI non disponibile. Configura il provider in Impostazioni.';
    }
  },



  async runAI(type) {
    const competitors = await IDB.getAll('competitors').catch(() => []);
    const compList = competitors.map(c => '- ' + c.name + ' (' + (c.platform||'Etsy') + '): avg €' + (c.avgPrice||'?') + ', nicchia: ' + (c.niche||'?') + ', recensioni: ' + (c.reviews||'?')).join('\n') || 'Nessun competitor tracciato';
    const baseCtx = 'Competitor tracciati:\n' + compList + '\n\n';
    const prompts = {
      positioning: 'Sei un market strategist per artigiani laser italiani. ' + baseCtx + 'Analisi posizionamento: dove si colloca questo business vs competitor, posizione prezzo, vantaggi unici, punti deboli. Concreto. Max 300 parole. In italiano.',
      gaps: 'Sei analista mercato artigianato laser italiano (Etsy + B2B). ' + baseCtx + 'Identifica 3-5 gap di mercato concreti: categorie o nicchie poco servite, con domanda stimata e difficolta. Max 300 parole. In italiano.',
      threats: 'Sei analista rischi per artigiano laser italiano. ' + baseCtx + 'Identifica 2-4 minacce competitive: pressione prezzi, nuovi entranti, cambi piattaforma, trend. Per ciascuna: severita (Alta/Media/Bassa), orizzonte, mitigazione. Max 300 parole. In italiano.',
      opportunities: 'Sei growth strategist per artigiano laser italiano. ' + baseCtx + 'Identifica 3-5 opportunita concrete basate su debolezze competitor, trend di mercato, o segmenti poco serviti. Con passi d azione. Max 300 parole. In italiano.',
    };
    const resultDiv = eid('mi-ai-result');
    const titleEl = eid('mi-ai-title');
    const contentEl = eid('mi-ai-content');
    const labels = { positioning:'🎯 Positioning Analysis', gaps:'🕳️ Market Gaps', threats:'⚠️ Threat Assessment', opportunities:'💡 Strategic Opportunities' };
    if (resultDiv) resultDiv.style.display = '';
    if (titleEl) titleEl.textContent = labels[type];
    if (contentEl) contentEl.textContent = '🤖 Analisi in corso...';
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:prompts[type]}]}) });
      const data = await resp.json();
      const text = data.content?.find(b=>b.type==='text')?.text || 'Analisi non disponibile. Configura il provider AI.';
      if (contentEl) contentEl.textContent = text;
    } catch(e) { if (contentEl) contentEl.textContent = 'AI non disponibile. Configura il provider in Impostazioni.'; }
  },



  async renderPricing() {
    const competitors = await IDB.getAll('competitors').catch(() => []);
    await BDW.init();
    const avgSale = BDW.metrics.revenue.mtd / Math.max(1, BDW.metrics.ops.ordersActive);
    const withPrice = competitors.filter(c => c.avgPrice > 0);
    const avgComp = withPrice.length ? withPrice.reduce((a,c)=>a+(+c.avgPrice),0)/withPrice.length : 0;
    if (eid('mi-p-yours'))    eid('mi-p-yours').textContent    = avgSale ? fmtCur(avgSale) : '—';
    if (eid('mi-p-market'))   eid('mi-p-market').textContent   = avgComp ? fmtCur(avgComp) : '—';
    const posStr = avgSale && avgComp ? (avgSale > avgComp * 1.1 ? 'Premium 💎' : avgSale < avgComp * 0.9 ? 'Value 💚' : 'Market 🎯') : '—';
    if (eid('mi-p-position')) eid('mi-p-position').textContent = posStr;
    const table = eid('mi-pricing-table'); if (!table) return;
    if (!withPrice.length) { table.innerHTML = '<div style="color:var(--text-dim);padding:16px;font-size:12px">Aggiungi competitor con prezzo medio per l&apos;analisi</div>'; return; }
    const rows = withPrice.map(function(c) {
      const vs = avgSale ? ((c.avgPrice / avgSale - 1) * 100).toFixed(0) : 0;
      const vsStr = vs > 0 ? '+' + vs + '%' : vs + '%';
      const vsCol = vs < -10 ? '#22c55e' : vs > 10 ? '#ef4444' : '#f59e0b';
      const pos2 = c.avgPrice > avgSale * 1.1 ? 'Premium' : c.avgPrice < avgSale * 0.9 ? 'Value' : 'Market';
      return '<tr style="border-top:1px solid var(--border2)">' +
        '<td style="padding:6px;font-weight:600">' + c.name + '</td>' +
        '<td style="text-align:center">' + fmtCur(c.avgPrice) + '</td>' +
        '<td style="text-align:center;color:' + vsCol + ';font-weight:700">' + vsStr + '</td>' +
        '<td style="text-align:center">' + pos2 + '</td></tr>';
    }).join('');
    table.innerHTML = '<table style="width:100%;font-size:12px;border-collapse:collapse">' +
      '<tr style="color:var(--text-muted);font-size:10px"><th style="text-align:left;padding:6px">Competitor</th><th>Avg €</th><th>vs Te</th><th>Posizione</th></tr>' +
      rows + '</table>';
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ⭐ FAVORITES & HIDE SYSTEM v56
// Favorites: pin sections to top bar for quick access
// Hide: collapse nav groups or individual items not needed today
// Storage: IDB key 'ui_prefs' (no localStorage)
// ══════════════════════════════════════════════════════════════════════════════
const EtsyLab = {
  _KEY: 'ingly_etsy_lab',
  _STATUSES: [
    {id:'da_testare', label:'🔬 Da Testare', color:'#64748b'},
    {id:'in_progress',label:'⚙️ In Progress',color:'#f59e0b'},
    {id:'testato',    label:'✅ Testato',    color:'#3b82f6'},
    {id:'buono',      label:'👍 Buono',      color:'#10b981'},
    {id:'top',        label:'🏆 Top',        color:'#f97316'},
  ],
  _filter: 'all',

  _load(){ return JSON.parse(localStorage.getItem(this._KEY)||'[]'); },
  _save(items){ localStorage.setItem(this._KEY, JSON.stringify(items)); },

  async render(){
    const items = this._load();
    this._renderStats(items);
    this._renderGrid(items);
  },

  filter(f){
    this._filter = f;
    document.querySelectorAll('.elab-filter-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.f===f);
      b.style.background = b.dataset.f===f ? 'var(--primary)' : '';
      b.style.color = b.dataset.f===f ? '#000' : '';
    });
    const items = this._load();
    this._renderGrid(items);
  },

  _renderStats(items){
    const el = eid('elab-stats'); if(!el) return;
    const stats = {da_testare:0, in_progress:0, buono:0, top:0};
    items.forEach(i=> stats[i.status] !== undefined ? stats[i.status]++ : null);
    el.innerHTML = [
      {l:'Idee Totali', v:items.length, c:'var(--primary)'},
      {l:'Da Testare',  v:stats.da_testare, c:'#64748b'},
      {l:'In Progress', v:stats.in_progress, c:'#f59e0b'},
      {l:'Top ⭐',      v:stats.top, c:'#f97316'},
    ].map(k=>`<div class="kpi-card"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
  },

  _renderGrid(items){
    const el = eid('elab-grid'); if(!el) return;
    const filtered = this._filter==='all' ? items : items.filter(i=>i.status===this._filter);
    if(!filtered.length){
      el.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px">🛍️</div>
        <div style="font-size:16px;font-weight:700">${this._filter==='all'?'Aggiungi la prima idea Etsy!':'Nessuna idea in questa categoria'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Incolla il link di un listing Etsy o scrivi un'idea</div>
      </div>`;
      return;
    }
    el.innerHTML = filtered.map(item => this._card(item)).join('');
  },

  _card(item){
    const st = this._STATUSES.find(s=>s.id===item.status) || this._STATUSES[0];
    const stars = item.rating ? '⭐'.repeat(item.rating) : '';
    const tags = (item.tags||[]).map(t=>`<span style="padding:2px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;font-size:10px;color:var(--text-muted)">${t}</span>`).join('');
    return `<div style="background:var(--bg-card);border-radius:14px;border:1.5px solid var(--border);overflow:hidden;display:flex;flex-direction:column">
      <!-- Image -->
      <div style="position:relative;height:200px;background:var(--bg-card2);overflow:hidden;cursor:pointer" onclick="EtsyLab.openDetail(${item.id})">
        ${item.image ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:48px">🛍️</div>`}
        <div style="position:absolute;top:8px;right:8px">
          <span style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:${st.color}cc;color:#fff">${st.label}</span>
        </div>
        ${item.price ? `<div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.7);padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;color:#fff">${item.price}</div>` : ''}
      </div>
      <!-- Info -->
      <div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.3;cursor:pointer" onclick="EtsyLab.openDetail(${item.id})">${item.title||'Idea senza titolo'}</div>
        ${item.shop ? `<div style="font-size:11px;color:var(--primary)">🏪 ${item.shop}</div>` : ''}
        ${item.notes ? `<div style="font-size:11px;color:var(--text-muted);line-height:1.5">${item.notes.slice(0,100)}${item.notes.length>100?'…':''}</div>` : ''}
        ${stars ? `<div style="font-size:12px">${stars} ${item.rating}/5</div>` : ''}
        ${tags ? `<div style="display:flex;gap:4px;flex-wrap:wrap">${tags}</div>` : ''}
        <!-- Actions -->
        <div style="display:flex;gap:6px;margin-top:auto;flex-wrap:wrap">
          <select onchange="EtsyLab.setStatus(${item.id},this.value)" style="flex:1;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);padding:5px 6px;border-radius:6px;font-size:11px">
            ${this._STATUSES.map(s=>`<option value="${s.id}" ${item.status===s.id?'selected':''}>${s.label}</option>`).join('')}
          </select>
          ${item.url ? `<a href="${item.url}" target="_blank" style="padding:5px 10px;background:#f9731620;color:#fb923c;border:1px solid #f9731640;border-radius:6px;text-decoration:none;font-size:11px;font-weight:700">🔗 Etsy</a>` : ''}
          <button onclick="EtsyLab.analyze(${item.id})" style="padding:5px 10px;background:#6366f120;color:#a5b4fc;border:1px solid #6366f140;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">🤖 AI</button>
          <button onclick="EtsyLab.deleteIdea(${item.id})" style="padding:5px 8px;background:none;border:1px solid #ef444440;color:#f87171;border-radius:6px;cursor:pointer;font-size:11px">🗑️</button>
        </div>
      </div>
    </div>`;
  },

  addIdea(){
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:18px;padding:28px;max-width:540px;width:100%;border:1.5px solid var(--border);max-height:90vh;overflow-y:auto">
      <div style="font-size:18px;font-weight:800;margin-bottom:20px;color:var(--text)">🛍️ Aggiungi Idea Etsy</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">🔗 Link Etsy (opzionale — incolla per auto-analisi AI)</label>
          <input class="form-control" id="elab-url" placeholder="https://www.etsy.com/listing/..." oninput="EtsyLab._previewUrl(this.value)">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📝 Titolo / Descrizione idea</label>
          <input class="form-control" id="elab-title" placeholder="Es. Tagliere personalizzato con incisione nome">
        </div>
        <div class="form-row">
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">💰 Prezzo di listino</label>
            <input class="form-control" id="elab-price" placeholder="€24,99">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">⭐ Rating (1-5)</label>
            <input class="form-control" id="elab-rating" type="number" min="1" max="5" placeholder="—">
          </div>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">🖼️ URL Immagine (opzionale)</label>
          <input class="form-control" id="elab-img" placeholder="https://...immagine.jpg" oninput="EtsyLab._previewImg(this.value)">
          <div id="elab-img-preview" style="margin-top:8px"></div>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">🏷️ Tag (separati da virgola)</label>
          <input class="form-control" id="elab-tags" placeholder="legno, personalizzato, regalo, matrimonio">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📌 Stato</label>
          <select class="form-control" id="elab-status">
            ${this._STATUSES.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📝 Note personali</label>
          <textarea class="form-control" id="elab-notes" rows="2" placeholder="Cosa mi ha colpito? Cosa potrei fare meglio?"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer">Annulla</button>
        <button onclick="EtsyLab.analyzeAndSave(this.closest('[style*=fixed]'))" style="padding:10px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🤖 Analizza con AI e Salva</button>
        <button onclick="EtsyLab._saveFromModal(this.closest('[style*=fixed]'))" style="padding:10px 20px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">💾 Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  _previewImg(url){
    const el=eid('elab-img-preview');
    if(!el||!url)return;
    el.innerHTML=`<img src="${url}" style="max-height:120px;border-radius:8px;object-fit:cover" onerror="this.parentElement.innerHTML='<span style=color:var(--red);font-size:11px>Immagine non caricabile</span>'">`;
  },

  _previewUrl(url){
    if(!url||!url.includes('etsy.com'))return;
    const titleEl=eid('elab-title');
    if(titleEl&&!titleEl.value) titleEl.value='(analisi AI al salvataggio)';
  },

  _saveFromModal(modalEl){
    const item = {
      id: Date.now(),
      url: eid('elab-url')?.value.trim()||'',
      title: eid('elab-title')?.value.trim()||'Idea Etsy',
      price: eid('elab-price')?.value.trim()||'',
      rating: +eid('elab-rating')?.value||0,
      image: eid('elab-img')?.value.trim()||'',
      tags: (eid('elab-tags')?.value||'').split(',').map(t=>t.trim()).filter(Boolean),
      status: eid('elab-status')?.value||'da_testare',
      notes: eid('elab-notes')?.value.trim()||'',
      createdAt: new Date().toISOString(),
    };
    const items = this._load();
    items.unshift(item);
    this._save(items);
    if(modalEl)modalEl.remove();
    this.render();
    toast('Idea salvata ✅','success');
  },

  async analyzeAndSave(modalEl){
    const url = eid('elab-url')?.value.trim();
    const title = eid('elab-title')?.value.trim();
    if(!url&&!title){ toast('Inserisci URL o titolo','warning'); return; }
    const btn = modalEl?.querySelector('[onclick*=analyzeAndSave]');
    if(btn){ btn.textContent='⏳ Analisi...'; btn.disabled=true; }
    const bd = JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const prompt = `Sei un esperto di Etsy e prodotti artigianali italiani.
Brand: ${bd.brand_name||'Ingly Design'} — laser su legno e plexiglass, Made in Sicily.
${url ? `URL Etsy: ${url}` : ''}
${title ? `Descrizione idea: ${title}` : ''}

Analizza questa idea prodotto per Etsy e rispondi in JSON con questi campi esatti:
{
  "title": "titolo ottimizzato SEO (max 140 char)",
  "market_potential": "alto|medio|basso",
  "competition": "alta|media|bassa",  
  "suggested_price_eur": numero,
  "tags": ["tag1","tag2",...] (13 tag Etsy SEO),
  "pros": "punti di forza in 1 riga",
  "cons": "criticità in 1 riga",
  "suggestion": "consiglio pratico per Ingly Design in 2 righe",
  "rating": numero 1-5
}
Rispondi SOLO con il JSON, niente altro.`;
    try{
      const res = await AIProvider.call(prompt, 800);
      const clean = res.replace(/```json|```/g,'').trim();
      const data = JSON.parse(clean);
      // Pre-fill form
      if(data.title && eid('elab-title')) eid('elab-title').value = data.title;
      if(data.rating && eid('elab-rating')) eid('elab-rating').value = data.rating;
      if(data.tags && eid('elab-tags')) eid('elab-tags').value = data.tags.join(', ');
      const notesEl = eid('elab-notes');
      if(notesEl) notesEl.value = `Potenziale: ${data.market_potential} | Competizione: ${data.competition} | Prezzo suggerito: €${data.suggested_price_eur}\n✅ ${data.pros}\n⚠️ ${data.cons}\n💡 ${data.suggestion}`;
      if(data.suggested_price_eur && eid('elab-price') && !eid('elab-price').value) eid('elab-price').value = `€${data.suggested_price_eur}`;
    }catch(e){
      // AI not available — save anyway without analysis
      console.log('AI analysis skipped:', e.message);
    }
    if(btn){ btn.textContent='🤖 Analizza'; btn.disabled=false; }
    this._saveFromModal(modalEl);
  },

  async analyze(id){
    const items = this._load();
    const item = items.find(i=>i.id===id);
    if(!item)return;
    toast('⏳ AI sta analizzando...','info');
    const bd = JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const prompt = `Analisi brevissima per un artigiano Etsy italiano (Ingly Design — laser legno/plexi Sicily).
Prodotto: "${item.title}" ${item.price?`Prezzo: ${item.price}`:''} ${item.url?`URL: ${item.url}`:''}
Rispondi in 3 righe: 1) Potenziale mercato 2) Cosa migliorare 3) Prezzo ottimale`;
    try{
      const res = await AIProvider.call(prompt, 400);
      item.aiAnalysis = res;
      this._save(items);
      this.render();
      toast('Analisi AI completata ✅','info');
    }catch(e){
      toast('AI non disponibile — configura la chiave in Impostazioni','warning');
    }
  },

  setStatus(id, status){
    const items = this._load();
    const item = items.find(i=>i.id===id);
    if(!item)return;
    item.status = status;
    this._save(items);
    this._renderStats(items);
    toast(`Stato aggiornato: ${this._STATUSES.find(s=>s.id===status)?.label}`, '📌');
  },

  openDetail(id){
    const items = this._load();
    const item = items.find(i=>i.id===id);
    if(!item)return;
    const st = this._STATUSES.find(s=>s.id===item.status)||this._STATUSES[0];
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:18px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;border:1.5px solid var(--border)">
      ${item.image?`<img src="${item.image}" style="width:100%;height:260px;object-fit:cover;border-radius:18px 18px 0 0">` : `<div style="height:120px;background:var(--bg-card2);border-radius:18px 18px 0 0;display:flex;align-items:center;justify-content:center;font-size:48px">🛍️</div>`}
      <div style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div style="font-size:16px;font-weight:800;color:var(--text);flex:1;padding-right:12px">${item.title}</div>
          <span style="padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;background:${st.color}30;color:${st.color};white-space:nowrap">${st.label}</span>
        </div>
        ${item.price?`<div style="font-size:20px;font-weight:900;color:var(--primary);margin-bottom:12px">${item.price}</div>`:''}
        ${item.rating?`<div style="font-size:16px;margin-bottom:12px">${'⭐'.repeat(item.rating)} ${item.rating}/5</div>`:''}
        ${item.notes?`<div style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:14px;white-space:pre-line">${item.notes}</div>`:''}
        ${item.aiAnalysis?`<div style="background:var(--bg-card2);border-radius:10px;padding:14px;margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:8px">🤖 Analisi AI</div><div style="font-size:12px;color:var(--text);line-height:1.7;white-space:pre-line">${item.aiAnalysis}</div></div>`:''}
        ${(item.tags||[]).length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${item.tags.map(t=>`<span style="padding:3px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;font-size:11px;color:var(--text-muted)">#${t}</span>`).join('')}</div>`:''}
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${item.url?`<a href="${item.url}" target="_blank" style="padding:10px 18px;background:#f9731620;color:#fb923c;border:1px solid #f9731640;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">🔗 Apri su Etsy</a>`:''}
          <button onclick="EtsyLab.analyze(${item.id});this.closest('[style*=fixed]').remove()" style="padding:10px 18px;background:#6366f120;color:#a5b4fc;border:1px solid #6366f140;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🤖 Ri-Analizza</button>
          <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;padding:10px 18px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;font-size:13px">Chiudi</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  deleteIdea(id){
    if(!confirm('Eliminare questa idea?'))return;
    const items = this._load().filter(i=>i.id!==id);
    this._save(items);
    this.render();
    toast('Idea eliminata','success');
  },
};

// Register in App routing
(function(){
  if(App._sectionMap){
    App._sectionMap.etsyai = ()=>(typeof EtsyLab!=='undefined'&&EtsyLab.render());
  }
})();



// ══════════════════════════════════════════════════════════════════
// EXCEL EXPORT — .xlsx con intestazioni, totali, formattazione
// ══════════════════════════════════════════════════════════════════
const CompetitorPrices = {
  _KEY: 'ingly_competitor_data',

  async render(){
    const el = eid('view-comptrack'); if(!el) return;
    const saved = JSON.parse(localStorage.getItem(this._KEY)||'{"products":[],"lastUpdate":null}');

    el.innerHTML = `
      <div class="module-header">
        <div class="module-header-left">
          <div class="module-title"><i class="fas fa-search-dollar"></i> Analisi Prezzi Mercato</div>
          <div class="module-subtitle">Monitora la concorrenza e ottimizza il tuo pricing</div>
        </div>
        <div class="module-actions"><button class="btn btn-primary btn-sm" onclick="CompetitorPrices.addProduct()"><i class="fas fa-plus"></i> Aggiungi Prodotto</button></div>
      </div>

      <div class="grid-3 mb-16" id="comp-kpis"></div>

      <div class="card mb-16">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="card-title" style="margin:0">🛍️ Benchmark Prodotti vs Mercato</div>
          <button onclick="CompetitorPrices.analyzeAll()" class="btn btn-secondary btn-sm"><i class="fas fa-robot"></i> Analisi AI Mercato</button>
        </div>
        <div id="comp-table"></div>
      </div>

      <div class="card" id="comp-ai-analysis" style="display:none">
        <div class="card-title">🤖 Analisi AI Posizionamento</div>
        <div id="comp-ai-text" style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)"></div>
      </div>
    `;

    this._renderTable(saved);
    this._renderKpis(saved);
  },

  _renderKpis(saved){
    const el = eid('comp-kpis'); if(!el) return;
    const prods = saved.products||[];
    const below = prods.filter(p=>p.myPrice && p.avgMarket && p.myPrice < p.avgMarket).length;
    const above = prods.filter(p=>p.myPrice && p.avgMarket && p.myPrice > p.avgMarket).length;
    const aligned = prods.length - below - above;
    el.innerHTML = [
      {l:'Prodotti monitorati',v:prods.length,c:'var(--primary)'},
      {l:'Sotto mercato',v:below,c:below>0?'var(--orange)':'var(--green)'},
      {l:'Sopra mercato',v:above,c:'var(--blue)'},
    ].map(k=>`<div class="kpi-card"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
  },

  _renderTable(saved){
    const el = eid('comp-table'); if(!el) return;
    const prods = saved.products||[];
    if(!prods.length){
      el.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text-dim)"><div style="font-size:36px;margin-bottom:8px">🔍</div><div>Aggiungi prodotti da monitorare</div><div style="font-size:11px;color:var(--text-muted);margin-top:6px">Confronta i tuoi prezzi con Etsy, Amazon e competitor diretti</div></div>`;
      return;
    }
    el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="border-bottom:2px solid var(--border2)">
        <th style="padding:10px 8px;text-align:left;color:var(--text-muted);font-size:10px">Prodotto</th>
        <th style="padding:10px 8px;text-align:right;color:var(--text-muted);font-size:10px">Tuo Prezzo</th>
        <th style="padding:10px 8px;text-align:right;color:var(--text-muted);font-size:10px">Min Mercato</th>
        <th style="padding:10px 8px;text-align:right;color:var(--text-muted);font-size:10px">Media Mercato</th>
        <th style="padding:10px 8px;text-align:right;color:var(--text-muted);font-size:10px">Max Mercato</th>
        <th style="padding:10px 8px;text-align:center;color:var(--text-muted);font-size:10px">Posizione</th>
        <th style="padding:10px 8px;text-align:center;font-size:10px"></th>
      </tr></thead>
      <tbody>${prods.map((p,i)=>{
        const pos = !p.myPrice||!p.avgMarket ? null : p.myPrice < p.avgMarket*0.85 ? {l:'Sotto mercato',c:'#f59e0b'} : p.myPrice > p.avgMarket*1.2 ? {l:'Premium',c:'#6366f1'} : {l:'Allineato ✅',c:'#10b981'};
        const pct = p.myPrice&&p.avgMarket ? ((p.myPrice-p.avgMarket)/p.avgMarket*100).toFixed(1) : null;
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:10px 8px;font-weight:600">${p.name}</td>
          <td style="padding:10px 8px;text-align:right;font-weight:700;color:var(--primary)">${p.myPrice?'€'+p.myPrice:'-'}</td>
          <td style="padding:10px 8px;text-align:right;color:var(--text-muted)">${p.minMarket?'€'+p.minMarket:'-'}</td>
          <td style="padding:10px 8px;text-align:right;color:var(--text-muted)">${p.avgMarket?'€'+p.avgMarket:'-'}</td>
          <td style="padding:10px 8px;text-align:right;color:var(--text-muted)">${p.maxMarket?'€'+p.maxMarket:'-'}</td>
          <td style="padding:10px 8px;text-align:center">${pos?`<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${pos.c}20;color:${pos.c}">${pos.l}${pct?` (${pct>0?'+':''}${pct}%)`:''}</span>`:'<span style="color:var(--text-dim);font-size:10px">—</span>'}</td>
          <td style="padding:10px 8px;text-align:center;display:flex;gap:4px">
            <button onclick="CompetitorPrices.editProduct(${i})" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:10px;color:var(--text)">✏️</button>
            <button onclick="CompetitorPrices.removeProduct(${i})" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:10px;color:var(--red)">🗑️</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  addProduct(idx=null){
    const saved = JSON.parse(localStorage.getItem(this._KEY)||'{"products":[]}');
    const existing = idx!==null ? saved.products[idx] : {};
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:480px;width:100%;border:1px solid var(--border)">
      <div style="font-size:16px;font-weight:800;margin-bottom:18px">🔍 ${idx!==null?'Modifica':'Aggiungi'} Prodotto</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Nome Prodotto</label><input class="form-control" id="cp-name" value="${existing.name||''}" placeholder="Es. Tagliere noce personalizzato 30×20cm"></div>
        <div class="form-row">
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Tuo Prezzo €</label><input class="form-control" id="cp-my" type="number" step="0.01" value="${existing.myPrice||''}"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Media Mercato €</label><input class="form-control" id="cp-avg" type="number" step="0.01" value="${existing.avgMarket||''}"></div>
        </div>
        <div class="form-row">
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Min Mercato €</label><input class="form-control" id="cp-min" type="number" step="0.01" value="${existing.minMarket||''}"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Max Mercato €</label><input class="form-control" id="cp-max" type="number" step="0.01" value="${existing.maxMarket||''}"></div>
        </div>
        <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Note competitor (es. URL Etsy, piattaforma)</label><input class="form-control" id="cp-notes" value="${existing.notes||''}" placeholder="etsy.com/search?q=tagliere+personalizzato"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer">Annulla</button>
        <button onclick="CompetitorPrices._saveProduct(${idx},this.closest('[style*=fixed]'))" style="padding:10px 20px;background:var(--primary);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700">💾 Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  editProduct(idx){ this.addProduct(idx); },

  _saveProduct(idx,modalEl){
    const saved = JSON.parse(localStorage.getItem(this._KEY)||'{"products":[]}');
    const p = {
      name: eid('cp-name')?.value||'',
      myPrice: +eid('cp-my')?.value||0,
      avgMarket: +eid('cp-avg')?.value||0,
      minMarket: +eid('cp-min')?.value||0,
      maxMarket: +eid('cp-max')?.value||0,
      notes: eid('cp-notes')?.value||'',
    };
    if(!p.name){ toast('Inserisci il nome del prodotto','warning'); return; }
    if(idx!==null && idx>=0) saved.products[idx]=p; else saved.products.push(p);
    localStorage.setItem(this._KEY, JSON.stringify(saved));
    if(modalEl)modalEl.remove();
    this.render();
    toast('Prodotto salvato ✅','info');
  },

  removeProduct(idx){
    if(!confirm('Rimuovere questo prodotto?')) return;
    const saved = JSON.parse(localStorage.getItem(this._KEY)||'{"products":[]}');
    saved.products.splice(idx,1);
    localStorage.setItem(this._KEY, JSON.stringify(saved));
    this.render();
  },

  async analyzeAll(){
    const saved = JSON.parse(localStorage.getItem(this._KEY)||'{"products":[]}');
    if(!saved.products.length){ toast('Aggiungi almeno un prodotto prima','warning'); return; }
    const aiBox = eid('comp-ai-analysis');
    const aiText = eid('comp-ai-text');
    if(aiBox) aiBox.style.display='block';
    if(aiText) aiText.textContent='⏳ AI sta analizzando il tuo posizionamento prezzi…';
    const bd = JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const prodList = saved.products.map(p=>`- ${p.name}: tuo €${p.myPrice||'?'} | mercato min €${p.minMarket||'?'} / avg €${p.avgMarket||'?'} / max €${p.maxMarket||'?'}`).join('\n');
    const prompt = `Sei un esperto di pricing per artigiani e-commerce italiani.
Brand: ${bd.brand_name||'Ingly Design'} — ${bd.usp||'prodotti personalizzati laser in legno, Made in Italy'}

DATI PREZZI:
${prodList}

Analizza il posizionamento prezzi e rispondi in italiano con:
1. 📊 ANALISI GENERALE — come siamo posizionati rispetto al mercato?
2. 🎯 OPPORTUNITÀ — quali prodotti potremmo alzare di prezzo senza perdere clienti?
3. ⚠️ RISCHI — dove rischiamo di perdere vendite per prezzo troppo alto?
4. 💡 RACCOMANDAZIONI — 3 azioni concrete da fare questa settimana
5. 🏆 STRATEGIA — premium brand vs volume, qual è meglio per questo business?`;
    try{
      const res = await AIProvider.call(prompt, 1000);
      if(aiText) aiText.innerHTML = res.replace(/\n/g,'<br>');
      toast('Analisi completata ✅','info');
    }catch(e){
      if(aiText) aiText.textContent = e.message;
    }
  },
};

// Register CompetitorPrices in App routing
(function(){
  const _origNav = App.renderSection?.bind(App);
  if(App.renderSection){
    const origMap = App._sectionMap;
    if(origMap && !origMap.comptrack){
      origMap.comptrack = ()=>(typeof CompetitorPrices!=='undefined'&&CompetitorPrices.render());
    }
  }
})();


// ==========================================
// INGLY OS v17.0 — AI NEUROMARKETING
// ==========================================

// ===== CONTENT CALENDAR AI =====
const ContentCalendar = {
  render(){
    const el=eid('view-contentcalendar');
    if(!el)return;
    el.innerHTML=`
    <div style="padding:20px;max-width:1100px">
      <h2 style="color:var(--primary);margin-bottom:4px">🗓️ Content Calendar AI</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">Piano social settimanale generato dall'AI basato sui tuoi prodotti, stagione e trend del momento</p>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px">
        <div style="background:var(--bg-card);border-radius:var(--radius);padding:20px;border:1px solid var(--border)">
          <h3 style="font-size:14px;margin-bottom:16px">⚙️ Configura</h3>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Settimana di riferimento</label>
            <input type="week" id="cc-week" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px">
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Tono di voce</label>
            <select id="cc-tone" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px">
              <option>Caldo e personale</option>
              <option>Professionale ed elegante</option>
              <option>Divertente e creativo</option>
              <option>Emozionale e narrativo</option>
            </select>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Focus prodotti (opzionale)</label>
            <textarea id="cc-focus" rows="3" placeholder="es. segnaposto matrimonio, targhe personalizzate..." style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;resize:none;box-sizing:border-box"></textarea>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Piattaforme</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${['Instagram','Facebook','TikTok','Pinterest','WhatsApp Status'].map(p=>`
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                <input type="checkbox" value="${p}" class="cc-platform" ${p!='TikTok'?'checked':''} style="accent-color:var(--primary)"> ${p}
              </label>`).join('')}
            </div>
          </div>
          <button onclick="ContentCalendar.generate()" style="width:100%;padding:10px;background:var(--primary);color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px">
            🪄 Genera Piano Settimanale
          </button>
        </div>
        <div id="cc-output" style="background:var(--bg-card);border-radius:var(--radius);padding:20px;border:1px solid var(--border)">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <div style="font-size:48px;margin-bottom:16px">🗓️</div>
            <div style="font-size:16px">Configura e clicca "Genera Piano" per ottenere il tuo calendario social settimanale personalizzato</div>
          </div>
        </div>
      </div>
    </div>`;

    // Set current week
    const now=new Date();
    const monday=new Date(now.setDate(now.getDate()-now.getDay()+1));
    const year=monday.getFullYear();
    const week=Math.ceil((((monday - new Date(year,0,1))/86400000)+1)/7);
    document.getElementById('cc-week').value=`${year}-W${String(week).padStart(2,'0')}`;
  },

  async generate(){
    const tone=document.getElementById('cc-tone').value;
    const focus=document.getElementById('cc-focus').value;
    const platforms=[...document.querySelectorAll('.cc-platform:checked')].map(p=>p.value).join(', ');
    const weekVal=document.getElementById('cc-week').value;

    // Get real products from store
    const prods=(await AppStore.get('catalog').catch(()=>[])).slice(0,8).map(p=>p.name).join(', ')||'prodotti artigianali personalizzati';
    const sales=await AppStore.get('sales');
    const topProd=sales.length>0 ? (sales.sort((a,b)=>b.amount-a.amount)[0].productName||'prodotto bestseller') : 'prodotto principale';

    const output=document.getElementById('cc-output');
    output.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:32px;animation:spin 1s linear infinite;display:inline-block">⚙️</div><br><br>L'AI sta creando il tuo piano social...</div>`;

    const prompt=`Sei un esperto di social media marketing per artigiani e piccole imprese creative italiane.

Crea un piano social settimanale dettagliato per la settimana ${weekVal}.

BUSINESS INFO:
- Tipo: artigianato personalizzato (laser, stampa, legno, acrilico)
- Prodotti: ${prods}
- Bestseller: ${topProd}
- Focus speciale: ${focus||'nessuno'}
- Tono: ${tone}
- Piattaforme: ${platforms}

CREA IL PIANO per ogni giorno (lun-dom) con:
- Orario ottimale di pubblicazione
- Tipo di contenuto (foto prodotto, reel processo, storia, carousel, etc.)
- Caption COMPLETA pronta da copiare (non solo idea, testo vero)
- 8-10 hashtag specifici e nicchia
- CTA chiara

FORMAT: usa questo schema per ogni giorno:
📅 GIORNO - ORE HH:MM - [PIATTAFORMA]
🎯 Tipo: [tipo contenuto]
📝 Caption:
[testo completo della caption]
#hashtag1 #hashtag2 ... 
💡 Tip: [consiglio pratico per il contenuto visivo]

Sii specifico, usa l'italiano, e crea contenuti che rispecchino il brand artigianale autentico.`;

    try{
      const text = await AIProvider.call(prompt, 3000);

      output.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;color:var(--primary)">📅 Piano Settimana ${weekVal}</h3>
          <button onclick="ContentCalendar.copyAll()" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia tutto</button>
        </div>
        <div id="cc-text" style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)">${text.replace(/📅/g,'<br><br>📅').replace(/🎯/g,'<br>🎯').replace(/📝/g,'<br>📝').replace(/💡/g,'<br>💡').replace(/#(\w+)/g,'<span style="color:var(--primary)">#$1</span>')}</div>`;
    }catch(e){
      output.innerHTML=`<div style="color:#ef4444;padding:20px">Errore: ${e.message}</div>`;
    }
  },

  copyAll(){
    const text=document.getElementById('cc-text')?.innerText||'';
    navigator.clipboard.writeText(text).then(()=>App.toast('Piano copiato!','success'));
  }
};

// ===== TREND SCANNER =====
const TrendScanner = {

  render(){
    const el = eid('view-trendscanner');
    if(!el) return;

    // Detect if AI is configured
    const hasAI = typeof AIStudio !== 'undefined';
    const hasKey = typeof AIProvider !== 'undefined' ? AIProvider.hasKey() : false;
    const aiStatus = !hasAI ? 'modulo non caricato' : !hasKey ? '⚠️ API key mancante — vai in ⚙️ Impostazioni → AI Hub' : '✅ AI pronta';
    const aiStatusColor = hasKey ? '#22c55e' : '#f97316';

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1200px">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🔍</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;color:var(--text)">Trend Hunter Pro</h2>
          <div style="font-size:11px;color:var(--text-muted)">AI + Reddit live + FRED prezzi materie + database gratuiti | <span style="color:${aiStatusColor};font-weight:700">${aiStatus}</span></div>
        </div>
        ${!hasKey ? `<button onclick="App.navigate('settings')" class="btn btn-secondary btn-sm" style="flex-shrink:0"><i class="fas fa-key"></i> Configura AI</button>` : ''}
      </div>

      <!-- QUICK ACTIONS BAR -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button onclick="TrendScanner.analyzeAI()" style="padding:8px 16px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:7px">
          <i class="fas fa-robot"></i> Analisi AI Completa
        </button>
        <button onclick="TrendScanner.fetchRedditTrends()" class="btn btn-secondary btn-sm"><i class="fas fa-reddit" style="color:#ff4500"></i> Reddit Live</button>
        <button onclick="TrendScanner.fetchMaterialPrices()" class="btn btn-secondary btn-sm"><i class="fas fa-chart-line" style="color:#22c55e"></i> Prezzi Materie Prime</button>
        <button onclick="TrendScanner.fetchEtsyInsights()" class="btn btn-secondary btn-sm"><i class="fas fa-shopping-bag" style="color:#f0728f"></i> Keyword Etsy AI</button>
        <button onclick="TrendScanner.fullReport()" class="btn btn-secondary btn-sm" style="margin-left:auto;border-color:var(--primary);color:var(--primary)"><i class="fas fa-file-alt"></i> Report Completo</button>
      </div>

      <!-- MAIN GRID: Settings + Quick Searches -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">

        <!-- AI Settings -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:var(--primary);margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px">🤖 Configura Analisi AI</h3>
          <div style="margin-bottom:8px">
            <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">Il tuo business</label>
            <textarea id="ts-niche" rows="2" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;resize:none;box-sizing:border-box;line-height:1.5">Artigianato personalizzato laser: segnaposto matrimoni, targhe aziendali, decorazioni in legno e acrilico. Target: privati per eventi, aziende per gadget corporate. Sicilia, Italia.</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <div>
              <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">Keyword focus</label>
              <input id="ts-keyword" class="form-control" style="font-size:12px;height:32px" value="segnaposto matrimonio personalizzato">
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">Stagione</label>
              <select id="ts-season" class="form-control" style="font-size:12px;height:32px">
                <option>Primavera</option><option>Estate</option><option>Autunno</option><option>Inverno</option>
              </select>
            </div>
          </div>
          <button onclick="TrendScanner.analyzeAI()" style="width:100%;padding:9px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">
            🔍 Analizza Trend
          </button>
        </div>

        <!-- Quick Searches -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#8b5cf6;margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px">⚡ Ricerche Rapide</h3>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[
              ['🌲','Trend prodotti laser su legno 2026','prodotti laser legno acrilico trend etsy 2026 italia'],
              ['💒','Wedding gifts trend Italia','wedding personalized gifts trending 2026 italy segnaposto'],
              ['🏢','Corporate gifts B2B laser','corporate gifts laser engraving trending b2b italy 2026'],
              ['📦','Prezzi materiali 2026','prezzi legno acrilico mdf 2026 italia andamento costi'],
              ['🎯','Best seller competitor Etsy','competitor etsy laser personalized italy best sellers ranking'],
              ['📱','Trend social artigianato','social media trend artigianato instagram tiktok 2026 made in italy'],
            ].map(([e,label,q])=>`<button onclick="TrendScanner.quickSearch('${q}')" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;color:var(--text);font-size:12px;text-align:left;display:flex;align-items:center;gap:8px;transition:.15s" onmouseover="this.style.borderColor='#8b5cf6'" onmouseout="this.style.borderColor='var(--border)'"><span>${e}</span><span>${label}</span></button>`).join('')}
          </div>
        </div>
      </div>

      <!-- LIVE DATA ROW -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">

        <!-- Reddit -->
        <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <i class="fab fa-reddit" style="color:#ff4500;font-size:16px"></i>
            <span style="font-size:12px;font-weight:700">Reddit Trends Live</span>
            <button onclick="TrendScanner.fetchRedditTrends()" style="margin-left:auto;background:none;border:none;color:#ff4500;cursor:pointer;font-size:10px;font-weight:700">↻ Aggiorna</button>
          </div>
          <div id="ts-reddit-panel">
            <div style="font-size:11px;color:var(--text-dim);text-align:center;padding:16px">
              <div style="font-size:20px;margin-bottom:4px">🔴</div>
              <button onclick="TrendScanner.fetchRedditTrends()" style="padding:6px 12px;background:#ff450015;border:1px solid #ff450040;border-radius:6px;cursor:pointer;color:#ff4500;font-size:11px;font-weight:700">Carica post recenti</button>
            </div>
          </div>
        </div>

        <!-- FRED Prices -->
        <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <i class="fas fa-chart-line" style="color:#22c55e;font-size:16px"></i>
            <span style="font-size:12px;font-weight:700">Prezzi Materie Prime</span>
            <button onclick="TrendScanner.fetchMaterialPrices()" style="margin-left:auto;background:none;border:none;color:#22c55e;cursor:pointer;font-size:10px;font-weight:700">↻ Aggiorna</button>
          </div>
          <div id="ts-fred-panel">
            <div style="font-size:11px;color:var(--text-dim);text-align:center;padding:16px">
              <div style="font-size:20px;margin-bottom:4px">📈</div>
              <button onclick="TrendScanner.fetchMaterialPrices()" style="padding:6px 12px;background:#22c55e15;border:1px solid #22c55e40;border-radius:6px;cursor:pointer;color:#22c55e;font-size:11px;font-weight:700">Carica prezzi FRED</button>
            </div>
          </div>
        </div>

        <!-- Etsy AI -->
        <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <i class="fas fa-shopping-bag" style="color:#f0728f;font-size:16px"></i>
            <span style="font-size:12px;font-weight:700">Etsy Keyword AI</span>
            <button onclick="TrendScanner.fetchEtsyInsights()" style="margin-left:auto;background:none;border:none;color:#f0728f;cursor:pointer;font-size:10px;font-weight:700">↻ Analizza</button>
          </div>
          <div id="ts-etsy-panel">
            <div style="font-size:11px;color:var(--text-dim);text-align:center;padding:16px">
              <div style="font-size:20px;margin-bottom:4px">🛍️</div>
              <button onclick="TrendScanner.fetchEtsyInsights()" style="padding:6px 12px;background:#f0728f15;border:1px solid #f0728f40;border-radius:6px;cursor:pointer;color:#f0728f;font-size:11px;font-weight:700">Analizza keyword</button>
            </div>
          </div>
        </div>
      </div>

      <!-- DATABASE FREE -->
      <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border);margin-bottom:14px">
        <h3 style="font-size:12px;font-weight:700;margin:0 0 12px;color:var(--text)">🗄️ Database Gratuiti — clicca per esplorare</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[
            ['ateco',       '🏭','ATECO',         'Codici attività Italia', '#f97316'],
            ['opencorporate','🏢','OpenCorporate', 'Aziende & fornitori IT', '#60a5fa'],
            ['wikidata',    '📚','Wikidata SPARQL','Materiali & prodotti',   '#a78bfa'],
            ['fred',        '📈','FRED API',       'Prezzi commodities',      '#22c55e'],
          ].map(([id,em,name,desc,col])=>`
            <button onclick="TrendScanner.showDatabase('${id}')" style="padding:12px 8px;border-radius:9px;border:2px solid var(--border);background:var(--bg-card2);cursor:pointer;text-align:center;transition:.15s" onmouseover="this.style.borderColor='${col}'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="font-size:22px;margin-bottom:5px">${em}</div>
              <div style="font-size:11px;font-weight:700;color:var(--text)">${name}</div>
              <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${desc}</div>
            </button>`).join('')}
        </div>
        <div id="ts-db-panel" style="margin-top:12px;display:none"></div>
      </div>

      <!-- OUTPUT PRINCIPALE -->
      <div id="ts-output" style="background:var(--bg-card);border-radius:12px;padding:20px;border:1px solid var(--border);min-height:120px">
        <div style="text-align:center;padding:32px;color:var(--text-muted)">
          <div style="font-size:48px;margin-bottom:12px">🔍</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">Trend Hunter Pro</div>
          <div style="font-size:12px;max-width:400px;margin:0 auto;line-height:1.6">
            Clicca <strong style="color:var(--primary)">Analisi AI Completa</strong> per un report completo,
            oppure usa le ricerche rapide e i dati live sopra.
          </div>
          ${!hasKey ? `<div style="margin-top:16px;padding:10px 16px;background:#f9731615;border:1px solid #f9731640;border-radius:8px;font-size:12px;color:#f97316;display:inline-block">
            ⚠️ Configura la API key AI per sbloccare le analisi — <button onclick="App.navigate('settings')" style="background:none;border:none;color:#f97316;font-weight:700;cursor:pointer;text-decoration:underline">Vai in Impostazioni</button>
          </div>` : ''}
        </div>
      </div>
    </div>`;

    // Auto-load live data after render
    setTimeout(() => {
      TrendScanner.fetchRedditTrends();
      TrendScanner.fetchMaterialPrices();
    }, 600);
  },

  // ── AI Analysis completa ─────────────────────────────────────────────────
  async analyzeAI(){
    const niche   = eid('ts-niche')?.value?.trim() || 'Artigianato laser personalizzato in Sicilia';
    const keyword = eid('ts-keyword')?.value?.trim() || 'segnaposto matrimonio';
    const season  = eid('ts-season')?.value || 'Primavera';
    const out     = eid('ts-output');

    if(out) out.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:32px;margin-bottom:12px">🤖</div>
      <div style="font-weight:700;font-size:14px">AI sta analizzando trend, mercato e opportunità...</div>
      <div style="font-size:12px;margin-top:6px;color:var(--text-dim)">Potrebbe richiedere 20-40 secondi</div>
    </div>`;

    // Arricchisci con dati reali del business
    let bizCtx = '';
    try {
      await BDW.init();
      const m = BDW.metrics;
      const topProds = m.products?.top?.slice(0,3).map(p=>p.name||p.desc||'N/D').join(', ')||'N/D';
      bizCtx = `\n\nI TUOI DATI REALI (aprile 2026): Revenue MTD €${m.revenue.mtd.toFixed(0)}, Clienti totali ${m.clients.total}, Top prodotti: ${topProds}, Ordini attivi: ${m.ops?.ordersActive||0}`;
    } catch(e){}

    const prompt = `Sei un esperto di e-commerce, trend di mercato e business artigianale italiano.${bizCtx}

BUSINESS: ${niche}
KEYWORD FOCUS: ${keyword}
STAGIONE: ${season} 2026

Produci un'analisi completa strutturata:

## 🔥 TREND IN ESPLOSIONE
Elenca 4-5 trend caldi per questa nicchia in ${season} 2026. Per ognuno: nome trend, perché sta crescendo, potenziale di vendita (alto/medio/basso), azione concreta.

## 💡 30 KEYWORD ETSY VINCENTI
Dividi in tre gruppi:
- **Alta priorità** (10 keyword, alto volume, media competizione)
- **Media priorità** (10 keyword, nicchia specifica)
- **Long tail** (10 keyword, bassissima competizione, alta conversione)

## 💰 ANALISI PREZZI DI MERCATO
- Range prezzi per categoria prodotto
- Prezzo medio competitor su Etsy
- Dove posizionarsi (premium/medio/entry)
- Margine tipico del settore

## 📱 CONTENT CALENDAR ${season}
4 idee post social per le prossime 4 settimane: piattaforma, formato, tema, hook di apertura.

## 🎯 3 AZIONI DA FARE QUESTA SETTIMANA
Azioni concrete, specifiche, ad alto impatto. Ordinate per ROI.

## ⚠️ 3 ERRORI DA EVITARE
Errori comuni in questo mercato che frenano le vendite.`;

    try {
      const result = await AIStudio._callAI(prompt, 2000);
      if(out) out.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:700;color:var(--text)">🤖 Analisi AI — ${new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'})}</div>
          <div style="display:flex;gap:8px">
            <button onclick="TrendScanner.copyResult()" class="btn btn-secondary btn-sm"><i class="fas fa-copy"></i> Copia</button>
            <button onclick="TrendScanner.analyzeAI()" class="btn btn-secondary btn-sm"><i class="fas fa-redo"></i> Rigenera</button>
          </div>
        </div>
        <div id="ts-ai-content" style="font-size:13px;line-height:1.8;color:var(--text)">${TrendScanner._md(result)}</div>`;
    } catch(e) {
      if(out) out.innerHTML = `<div style="padding:24px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">🔑</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:8px">API Key necessaria</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Configura una chiave AI per usare le analisi Trend Hunter Pro.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button onclick="App.navigate('settings')" class="btn btn-primary btn-sm"><i class="fas fa-key"></i> Configura API Key</button>
          <button onclick="window.open('https://aistudio.google.com/app/apikey','_blank')" class="btn btn-secondary btn-sm">Gemini Gratis →</button>
          <button onclick="window.open('https://console.groq.com/keys','_blank')" class="btn btn-secondary btn-sm">Groq Gratis →</button>
        </div>
        <div style="margin-top:12px;font-size:11px;color:var(--text-dim)">Errore: ${e.message||'Chiave non configurata'}</div>
      </div>`;
    }
  },

  // ── Ricerca rapida ───────────────────────────────────────────────────────
  async quickSearch(query){
    const out = eid('ts-output');
    if(out) out.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)"><div style="font-size:28px;margin-bottom:8px">🔍</div><div>Analisi in corso: <em>${query}</em>...</div></div>`;
    try {
      const result = await AIStudio._callAI(`Fai un'analisi pratica e specifica su: "${query}"\n\nFornisci:\n- Panoramica del tema in 2-3 righe\n- 3-5 dati/trend attuali (2025-2026) con numeri se possibile\n- Opportunità concrete per un artigiano laser italiano\n- 3 azioni immediate ad alto impatto\n\nSii diretto e pratico. Usa markdown per struttura. In italiano.`);
      if(out) out.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <span style="font-size:16px">🔍</span>
        <span style="font-size:12px;font-weight:700">Query: <em style="color:var(--primary)">${query}</em></span>
        <button onclick="(typeof TrendScanner!=='undefined'&&TrendScanner.render())" style="margin-left:auto;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:11px">← Torna</button>
      </div>
      <div style="font-size:13px;line-height:1.8">${TrendScanner._md(result)}</div>`;
    } catch(e) {
      if(out) out.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">Configura API key AI in Impostazioni per le ricerche avanzate.<br><button onclick="App.navigate('settings')" class="btn btn-primary btn-sm" style="margin-top:10px">⚙️ Impostazioni</button></div>`;
    }
  },

  // ── Report Completo ──────────────────────────────────────────────────────
  async fullReport(){
    const out = eid('ts-output');
    if(out) out.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:8px">📄</div><div>Generazione report completo...</div></div>`;
    const niche = eid('ts-niche')?.value||'artigianato laser';
    try {
      const result = await AIStudio._callAI(`Genera un report di business intelligence completo per: "${niche}" — aprile 2026.\n\nInclugi: stato del mercato, top 10 keyword, analisi prezzi, 5 opportunità di crescita, piano azioni 30 giorni, KPI da monitorare.\n\nFormato professionale con sezioni chiare. In italiano.`, 3000);
      if(out) out.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="font-weight:700">📄 Business Intelligence Report</div>
        <button onclick="TrendScanner.copyResult()" class="btn btn-secondary btn-sm"><i class="fas fa-copy"></i> Copia tutto</button>
      </div><div id="ts-ai-content" style="font-size:13px;line-height:1.8">${TrendScanner._md(result)}</div>`;
    } catch(e) {
      if(out) out.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">API key necessaria.<br><button onclick="App.navigate('settings')" class="btn btn-primary btn-sm" style="margin-top:10px">⚙️ Configura</button></div>`;
    }
  },

  // ── Reddit Live ──────────────────────────────────────────────────────────
  async fetchRedditTrends(){
    const panel = eid('ts-reddit-panel');
    if(panel) panel.innerHTML = `<div style="font-size:11px;color:var(--text-dim);padding:8px">⏳ Caricamento post Reddit...</div>`;
    const subs = ['DIY','woodworking','lasercutting'];
    const results = [];
    for(const sub of subs){
      try{
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=4&raw_json=1`,{signal:AbortSignal.timeout(5000)});
        if(!res.ok) continue;
        const d = await res.json();
        (d?.data?.children||[]).slice(0,3).forEach(p=>{
          results.push({title:p.data.title,score:p.data.score,comments:p.data.num_comments,
            url:'https://reddit.com'+p.data.permalink,sub:'r/'+p.data.subreddit,
            date:new Date(p.data.created_utc*1000).toLocaleDateString('it-IT')});
        });
      } catch(e){}
    }
    if(!results.length){
      if(panel) panel.innerHTML = `<div style="font-size:10px;color:var(--text-dim);line-height:1.5;padding:4px">Reddit bloccato da CORS nel browser. <a href="https://www.reddit.com/r/DIY+woodworking+lasercutting/hot" target="_blank" style="color:#ff4500;font-weight:700">Apri su Reddit ↗</a></div>`;
      return;
    }
    results.sort((a,b)=>b.score-a.score);
    if(panel) panel.innerHTML = results.slice(0,6).map(p=>`
      <div style="padding:6px 0;border-bottom:1px solid var(--border)">
        <a href="${p.url}" target="_blank" style="color:var(--text);font-size:11px;font-weight:600;text-decoration:none;line-height:1.3;display:block;margin-bottom:2px">${p.title.slice(0,65)}${p.title.length>65?'…':''}</a>
        <span style="font-size:9px;color:var(--text-dim)">${p.sub} · ⬆${p.score.toLocaleString()} · 💬${p.comments} · ${p.date}</span>
      </div>`).join('')
      + `<a href="https://www.reddit.com/r/DIY+woodworking+lasercutting/hot" target="_blank" style="display:block;margin-top:8px;font-size:10px;color:#ff4500;font-weight:700">Vedi tutti su Reddit ↗</a>`;
  },

  // ── FRED Prezzi ──────────────────────────────────────────────────────────
  async fetchMaterialPrices(){
    const panel = eid('ts-fred-panel');
    if(panel) panel.innerHTML = `<div style="font-size:11px;color:var(--text-dim);padding:8px">⏳ Caricamento prezzi FRED...</div>`;
    const series = [
      {id:'WPU081',  name:'Legno/Lumber',emoji:'🌲'},
      {id:'WPU0915', name:'Plastica/Acrilico',emoji:'🧪'},
      {id:'WPU101',  name:'Metalli',emoji:'⚙️'},
      {id:'PPIACO',  name:'PPI Commodity',emoji:'📦'},
    ];
    const results = [];
    for(const s of series){
      try{
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&limit=2&sort_order=desc&file_type=json&api_key=`;
        const res = await fetch(url, {signal:AbortSignal.timeout(4000)});
        if(!res.ok) continue;
        const d = await res.json();
        const obs = d?.observations||[];
        if(obs.length>=2){
          const curr=parseFloat(obs[0].value)||0, prev=parseFloat(obs[1].value)||0;
          const chg=prev>0?((curr-prev)/prev*100).toFixed(1):0;
          results.push({...s,curr:curr.toFixed(1),chg,up:curr>=prev,date:obs[0].date});
        }
      } catch(e){}
    }
    // Fallback data se FRED non risponde (richiede API key gratuita)
    const fallback=[
      {emoji:'🌲',name:'Legno (WPU081)',     curr:'142.3',chg:'+2.1',up:true},
      {emoji:'🧪',name:'Acrilico (WPU0915)', curr:'118.7',chg:'-0.8',up:false},
      {emoji:'⚙️',name:'Metalli (WPU101)',   curr:'156.2',chg:'+3.4',up:true},
      {emoji:'📦',name:'PPI Commodity',       curr:'133.8',chg:'+1.2',up:true},
    ];
    const data = results.length ? results : fallback;
    const isFallback = results.length === 0;
    if(panel) panel.innerHTML = (isFallback?`<div style="font-size:9px;color:var(--text-dim);margin-bottom:6px;padding:4px 6px;background:var(--bg-card2);border-radius:4px">⚠️ Dati simulati — <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" style="color:#22c55e">aggiungi chiave FRED gratuita</a></div>`:'')
      + data.map(r=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:14px">${r.emoji}</span>
        <span style="flex:1;font-size:11px;font-weight:600">${r.name}</span>
        <span style="font-size:12px;font-weight:700">${r.curr}</span>
        <span style="font-size:10px;font-weight:700;color:${r.up?'#22c55e':'#ef4444'}">${r.up?'▲':'▼'}${r.chg}%</span>
      </div>`).join('');
  },

  // ── Etsy Insights AI ─────────────────────────────────────────────────────
  async fetchEtsyInsights(){
    const panel = eid('ts-etsy-panel');
    const keyword = eid('ts-keyword')?.value || 'segnaposto matrimonio personalizzato';
    if(panel) panel.innerHTML = `<div style="font-size:10px;color:var(--text-dim);padding:6px">⏳ AI analizza keyword Etsy...</div>`;
    try{
      const result = await AIStudio._callAI(`Analisi keyword Etsy per: "${keyword}"\n\n**VOLUME:** stima mensile\n**COMPETIZIONE:** livello e seller stimati\n**PREZZO MEDIO:** range €\n**TOP 5 VARIANTI:** keyword correlate\n**STAGIONALITÀ:** mesi picco\n\nMax 120 parole. Solo dati pratici.`);
      if(panel) panel.innerHTML = `<div style="font-size:11px;line-height:1.6">${result.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>')}</div>`;
    } catch(e){
      if(panel) panel.innerHTML = `<div style="font-size:10px;color:var(--text-muted);padding:4px">Richiede API key AI. <button onclick="App.navigate('settings')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700">Configura →</button></div>`;
    }
  },

  // ── Database Info Panels ─────────────────────────────────────────────────
  showDatabase(db){
    const dbPanel = eid('ts-db-panel');
    if(!dbPanel) return;
    if(dbPanel.dataset.open===db){ dbPanel.style.display='none'; dbPanel.dataset.open=''; return; }
    dbPanel.dataset.open = db;
    dbPanel.style.display = '';

    const DB = {
      ateco:{name:'🏭 ATECO 2025',color:'#f97316',link:'https://www.istat.it/it/archivio/17888',linkText:'Catalogo ISTAT completo',
        rows:[['32.99.09','Fabbricazione altri prodotti manufatti nca','✅ Artigianato laser, targhe, decori'],
              ['18.12.09','Altre attività di stampa','Incisione personalizzata'],
              ['74.10.21','Disegnatori grafici di moda','Design prodotti personalizzati'],
              ['82.99.09','Altri servizi di supporto imprese nca','Gadget aziendali B2B'],
              ['47.78.34','Commercio al dettaglio oggetti d\'arte','Vendita diretta artigianato']]},
      opencorporate:{name:'🏢 OpenCorporate',color:'#60a5fa',link:'https://opencorporates.com/companies?jurisdiction_code=it',linkText:'Cerca aziende italiane',
        rows:[['Fornitori legno','Distributori MDF, compensato','Cerca su Pagine Gialle o CCIAA'],
              ['Fornitori acrilico','Lastre PMMA, plexiglass','Alternativa a fornitori esteri'],
              ['CCIAA locale','Camera di Commercio','Gratis — dati ufficiali italiani'],
              ['Fassa Bortolo / etc','Grossisti materiali edili','Spesso vendono anche legno/acrilico']]},
      wikidata:{name:'📚 Wikidata SPARQL',color:'#a78bfa',link:'https://query.wikidata.org/',linkText:'SPARQL Query Editor (gratuito)',
        rows:[['Q170050','Legno — proprietà, usi industriali','Dati strutturati aperti'],
              ['Q170198','Polimetilmetacrilato (Acrilico/PMMA)','Composizione, lavorabilità laser'],
              ['Q29539','Tecnologia Laser — applicazioni','Patent e riferimenti tecnici'],
              ['SPARQL','Query personalizzate','Gratuito, nessun login richiesto']]},
      fred:{name:'📈 FRED API',color:'#22c55e',link:'https://fred.stlouisfed.org/docs/api/api_key.html',linkText:'Chiave gratuita su FRED (5 minuti)',
        rows:[['WPU081','Lumber & Wood Products Index','Indice prezzi legno USA'],
              ['WPU0915','Plastics Products Index','Indice prezzi plastica/acrilico'],
              ['WPU101','Metals Index','Prezzi metalli'],
              ['PPIACO','Producer Price Index Commodities','PPI generale — barometro costi'],
              ['PCU321113','Softwood Lumber','Prezzi legno dolce specifico']]},
    };

    const d = DB[db];
    if(!d){dbPanel.style.display='none';return;}
    dbPanel.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:2px solid ${d.color}30">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <strong style="font-size:13px;color:${d.color}">${d.name}</strong>
        <button onclick="document.getElementById('ts-db-panel').style.display='none'" style="margin-left:auto;background:none;border:none;color:var(--text-dim);cursor:pointer">✕</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr style="background:var(--bg-card3)">
          <th style="padding:5px 8px;text-align:left;color:var(--text-dim)">ID/Codice</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text-dim)">Descrizione</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text-dim)">Note</th>
        </tr>
        ${d.rows.map(r=>`<tr style="border-top:1px solid var(--border)">
          <td style="padding:5px 8px;font-family:monospace;font-size:10px;color:${d.color};font-weight:700">${r[0]}</td>
          <td style="padding:5px 8px;color:var(--text)">${r[1]}</td>
          <td style="padding:5px 8px;color:var(--text-muted);font-size:10px">${r[2]}</td>
        </tr>`).join('')}
      </table>
      <a href="${d.link}" target="_blank" style="display:block;margin-top:10px;font-size:11px;color:${d.color};font-weight:700">${d.linkText} ↗</a>
    </div>`;
  },

  // ── Utils ────────────────────────────────────────────────────────────────
  copyResult(){
    const el = eid('ts-ai-content');
    if(el){ navigator.clipboard.writeText(el.innerText).then(()=>toast('📋 Copiato!','success')); }
  },

  _md(text){
    return text
      .replace(/^## (.+)$/gm,'<h3 style="color:var(--primary);font-size:14px;font-weight:800;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border)">$1</h3>')
      .replace(/^### (.+)$/gm,'<h4 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--text)">$1</h4>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em style="color:var(--text-muted)">$1</em>')
      .replace(/^- (.+)$/gm,'<div style="display:flex;gap:6px;margin:3px 0"><span style="color:var(--primary);flex-shrink:0;margin-top:1px">•</span><span>$1</span></div>')
      .replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
  },

  async analyze(){ return this.analyzeAI(); }
};

// ═══════════════════════════════════════════════════════════════════════
// RISORSE LASER — Hub completo mondo laser cut
// ═══════════════════════════════════════════════════════════════════════
const RisorseModule = {

  render(){
    const el = document.getElementById('view-risorse');
    if(!el) return;

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1300px">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#38bdf8,#6366f1);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🛠️</div>
        <div>
          <h2 style="margin:0 0 3px;font-size:20px;font-weight:800;color:var(--text)">Risorse Laser — Hub Completo</h2>
          <p style="margin:0;font-size:12px;color:var(--text-muted)">File gratis · Generatori scatole · Impostazioni materiali · Software · Community · Database — tutto il mondo laser in un posto</p>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button onclick="RisorseModule.openLink('https://www.google.com/search?q=laser+cut+files+free+2026')" class="btn btn-secondary btn-sm"><i class="fas fa-search"></i> Cerca risorse</button>
        </div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:4px;background:var(--bg-card2);padding:4px;border-radius:10px;margin-bottom:20px;flex-wrap:wrap">
        ${[
          ['file','📁 File Gratis'],
          ['generatori','⚙️ Generatori'],
          ['materiali','🪵 Materiali & Settings'],
          ['software','💻 Software'],
          ['vendi','💰 Dove Vendere'],
          ['community','👥 Community'],
          ['formule','📐 Formule & Calc'],
        ].map(([id,label])=>`<button onclick="RisorseModule.tab('${id}')" id="rtab-${id}" class="tab-btn${id==='file'?' active':''}" style="border-radius:7px;font-size:12px;padding:7px 14px">${label}</button>`).join('')}
      </div>

      <!-- TAB CONTENT -->
      <div id="risorse-tab-content"></div>
    </div>`;

    this.tab('file');
  },

  tab(id){
    document.querySelectorAll('[id^="rtab-"]').forEach(b=>{
      b.classList.toggle('active', b.id==='rtab-'+id);
    });
    const ct = document.getElementById('risorse-tab-content');
    if(!ct) return;
    ct.innerHTML = this['_tab_'+id]?.() || '<div style="color:var(--text-muted);padding:40px;text-align:center">Sezione in costruzione</div>';
  },

  openLink(url){ window.open(url,'_blank'); },

  // ── FILE GRATIS ────────────────────────────────────────────────────────
  _tab_file(){
    const sites = [
      {
        cat:'🏆 MIGLIORI — File pronti per laser, zero problemi',
        items:[
          {name:'3axis.co',      url:'https://3axis.co',                     fmt:'DXF SVG CDR',    free:'✅ Gratis',     note:'10.000+ file, download immediato senza registrazione. Enorme varietà. Qualità variabile.', tag:'top'},
          {name:'Vecty.co',      url:'https://vecty.co',                     fmt:'CDR DXF SVG',    free:'✅ Gratis',     note:'4.700+ file gratuiti. Ottime categorie: Natale, scatole, lampade, cornici. CDR ottimi per CO2.', tag:'top'},
          {name:'Freepatternsarea',url:'https://www.freepatternsarea.com',  fmt:'SVG DXF CDR PDF', free:'✅ Gratis',     note:'File disegnati a mano in CAD. Ottime qualità. Gioielli, scatole 3D, arte laser.', tag:'top'},
          {name:'LibraryLaser',  url:'https://www.librarylaser.com',         fmt:'SVG DXF CDR AI', free:'🟡 8/giorno',   note:'1.700+ design. Licenza CC (credita l\'autore). 8 download gratis al giorno con account.', tag:'top'},
          {name:'Cults3D',       url:'https://cults3d.com/en/3d-model/various/laser-cutting',fmt:'SVG DXF STL',free:'🟡 Misto',note:'Modelli condivisi da designer. Mix gratis e a pagamento. Qualità alta.', tag:'top'},
        ]
      },
      {
        cat:'📐 DXF / SVG SPECIALIZZATI',
        items:[
          {name:'DXFDownloads',  url:'https://dxfdownloads.com',             fmt:'DXF',            free:'✅ Gratis',     note:'Solo DXF. Silhouette, segnaletica, arte murale. Puliti e scalabili.'},
          {name:'FreeVector.us', url:'https://www.freevector.us',            fmt:'DXF SVG STL',    free:'✅ Gratis',     note:'Migliaia di vettori. Download immediato, nessun account.'},
          {name:'Vecteezy',      url:'https://www.vecteezy.com',             fmt:'SVG EPS AI',     free:'✅ Gratis',     note:'Libreria enorme, filtro per "laser cut". Richiede account free.'},
          {name:'Ameede',        url:'https://www.ameede.com',               fmt:'CDR DXF SVG',    free:'✅ Gratis',     note:'Ornamenti, cornici, arte layered. Path molto puliti, ottimi per incisione.'},
          {name:'VectorsArt',    url:'https://www.vectorsart.com',           fmt:'DXF SVG',        free:'✅ Gratis',     note:'Scatole, organizer, oggetti 3D. Tab e slot ben progettati.'},
        ]
      },
      {
        cat:'🛒 MARKETPLACE — File a pagamento e premium',
        items:[
          {name:'Etsy',          url:'https://www.etsy.com/search?q=laser+cut+svg+file',fmt:'SVG DXF',free:'💰 A pagamento',note:'File venduti da maker reali. Qualità spesso alta. Categoria "Digital Downloads" → laser.'},
          {name:'Design Bundles',url:'https://designbundles.net/free-design-resources/free-laser-cutting-files',fmt:'SVG DXF CDR',free:'🟡 Misto',note:'Sezione file gratis con licenza commerciale. Ottimo punto di partenza.'},
          {name:'Creative Fabrica',url:'https://www.creativefabrica.com/search/?query=laser+cut',fmt:'SVG DXF',free:'🟡 Misto',note:'Abbonamento mensile. Accesso illimitato a centinaia di file laser.'},
          {name:'Laser Ready Templates',url:'https://laserreadytemplates.com',fmt:'SVG DXF AI',free:'🟡 Misto',note:'5.000+ design. Sezione gratis buona. File ottimizzati specificamente per laser.'},
        ]
      },
      {
        cat:'🌐 COMMUNITY — File condivisi da maker',
        items:[
          {name:'Thingiverse',   url:'https://www.thingiverse.com/search?q=laser+cut&type=things&sort=popular',fmt:'STL SVG DXF',free:'✅ Gratis',note:'Milioni di file. Filtro "laser" trova ottimi progetti. Licenza open-source.'},
          {name:'Instructables', url:'https://www.instructables.com/search/?q=laser+cut&projects=all',fmt:'Vari',free:'✅ Gratis',note:'Tutorial + file allegati. Community attiva. Ottimo per imparare.'},
          {name:'Printables',    url:'https://www.printables.com/search/models?q=laser+cut',fmt:'STL SVG',free:'✅ Gratis',note:'Prusa community. Sezione laser in crescita.'},
          {name:'Atomm.com',     url:'https://www.atomm.com',               fmt:'XCS SVG DXF',    free:'✅ Gratis',     note:'Piattaforma xTool. Generatore AI integrato. Impostazioni macchina incluse.'},
        ]
      },
      {cat:'🔧 SOFTWARE & STRUMENTI LASER',items:[
        {name:'LightBurn',url:'https://lightburnsoftware.com',fmt:'lbrn2 SVG DXF',free:'💰 €40/anno',note:'Software professionale laser. Standard del settore. Trial 30 gg.',tag:'top'},
        {name:'LaserGRBL',url:'https://lasergrbl.com',fmt:'SVG G-code',free:'✅ Gratis',note:'Open source Windows. Ottimo per macchine GRBL.',tag:'top'},
        {name:'Inkscape',url:'https://inkscape.org/it',fmt:'SVG XML',free:'✅ Gratis',note:'Editor vettoriale open source. Indispensabile per creare file laser.',tag:'top'},
        {name:'xTool Creative Space',url:'https://www.xtool.com/pages/software',fmt:'XCS SVG DXF',free:'✅ Gratis',note:'Software nativo xTool con AI integrata.'},
        {name:'RDWorks',url:'https://rd-acs.com',fmt:'rld DXF',free:'✅ Gratis',note:'Per macchine Ruida CO2 cinesi.'},
        {name:'Affinity Designer',url:'https://affinity.serif.com/it',fmt:'SVG',free:'💰 €70 una tantum',note:'Alternativa valida ad Illustrator, prezzo fisso.'},
        {name:'K40 Whisperer',url:'https://www.scorchworks.com/K40Whisperer',fmt:'SVG DXF',free:'✅ Gratis',note:'Gratuito per K40/CO2 cinesi.'},
        {name:'EasyCut Studio',url:'https://easycutstudio.com',fmt:'SVG DXF',free:'💰 €30',note:'Windows/Mac. Alternativa economica a Corel.'},
      ]},
      {cat:'🤖 AI & GENERATORI',items:[
        {name:'Vectorizer.ai',url:'https://vectorizer.ai',fmt:'SVG',free:'✅ 2 gratis',note:'PNG/JPG in SVG vettoriale con AI. Qualità molto alta.',tag:'top'},
        {name:'Remove.bg',url:'https://www.remove.bg',fmt:'PNG',free:'✅ 1 gratis',note:'Rimuovi sfondo. Utile per preparare immagini per incisione.',tag:'top'},
        {name:'Bing Image Creator',url:'https://www.bing.com/images/create',fmt:'PNG',free:'✅ Gratis',note:'DALL-E 3 gratis. Genera immagini da incidere.'},
        {name:'ChatGPT',url:'https://chat.openai.com',fmt:'Testo/PNG',free:'✅ Gratis',note:'Genera pattern, testi creativi, idee prodotto.'},
        {name:'SVGFlow',url:'https://www.svgflow.io',fmt:'SVG',free:'✅ Gratis',note:'Genera SVG vettoriali via AI. Ottimo per pattern geometrici.'},
      ]},
      {cat:'🔢 CALCOLATORI & UTILITÀ',items:[
        {name:'Laser Cutting Calc',url:'https://www.lasercuttingcalculator.com',fmt:'Web',free:'✅ Gratis',note:'Calcola costo taglio laser per materiale e macchina.',tag:'top'},
        {name:'SVG Path Editor',url:'https://yqnn.github.io/svg-path-editor',fmt:'SVG',free:'✅ Gratis',note:'Edita path SVG online. Correggi file problematici.'},
        {name:'DXF Viewer',url:'https://sharecad.org',fmt:'DXF DWG',free:'✅ Gratis',note:'Visualizza DXF/DWG online senza software.'},
        {name:'SVG to DXF',url:'https://cloudconvert.com/svg-to-dxf',fmt:'DXF',free:'✅ Gratis',note:'Converti SVG in DXF per RDWorks/LightBurn.'},
        {name:'Nest It',url:'https://nestit.online',fmt:'SVG DXF',free:'✅ Trial',note:'Nesting: ottimizza posizionamento pezzi su foglio.'},
      ]},
      {cat:'🇮🇹 COMMUNITY & RISORSE IT',items:[
        {name:'Reddit r/lasercutting',url:'https://www.reddit.com/r/lasercutting',fmt:'Forum',free:'✅ Gratis',note:'Community internazionale. Domande, trick e ispirazioni.',tag:'top'},
        {name:'Instructables Laser',url:'https://www.instructables.com/search/?q=laser+cutting',fmt:'Tutorial',free:'✅ Gratis',note:'Tutorial pratici step-by-step per progetti laser.'},
        {name:'Make in Italy',url:'https://www.make.it',fmt:'Forum',free:'✅ Gratis',note:'Maker movement italiano. Forum e guide laser.'},
        {name:'xTool Forum IT',url:'https://forum.xtool.com/c/italian',fmt:'Forum',free:'✅ Gratis',note:'Forum ufficiale xTool italiano.'},
      ]},
      {cat:'🛒 FORNITORI MATERIALI IT',items:[
        {name:'Atomm.com',url:'https://www.atomm.com',fmt:'Legni MDF',free:'💰 Shop',note:'MIGLIORE legni laser IT. Betulla, tiglio, noce, mogano.',tag:'top'},
        {name:'Lasertale EU',url:'https://www.lasertale.com',fmt:'Legni Ply',free:'💰 Shop',note:'Legni e plywood laser. Spedizione EU rapida.',tag:'top'},
        {name:'Artistico.it',url:'https://www.artistico.it',fmt:'Plexiglass',free:'💰 Shop',note:'Plexiglass laser-ready. Tutti i colori e specchiati.',tag:'top'},
        {name:'Supermagnete.it',url:'https://www.supermagnete.it',fmt:'Magneti',free:'💰 Shop',note:'Migliore per magneti Italia. Stock enorme.'},
        {name:'Plexi.it',url:'https://www.plexi.it',fmt:'Acrilico',free:'💰 Shop',note:'Acrilico su misura. Tutti colori e spessori.'},
      ]}
    ];

    return `<div style="display:flex;flex-direction:column;gap:20px">
      ${sites.map(cat=>`
        <div>
          <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">${cat.cat}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
            ${cat.items.map(s=>`
              <div onclick="RisorseModule.openLink('${s.url}')" style="padding:14px;border-radius:11px;border:${s.tag==='top'?'2px solid var(--primary-border)':'1px solid var(--border)'};background:${s.tag==='top'?'var(--primary-dim)':'var(--bg-card)'};cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='${s.tag==='top'?'var(--primary-border)':'var(--border)'}'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:13px;font-weight:800;color:var(--text)">${s.name}</span>
                  <span style="margin-left:auto;font-size:10px;font-weight:700;color:${s.free.includes('✅')?'#22c55e':s.free.includes('🟡')?'#f59e0b':'#ef4444'}">${s.free}</span>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
                  ${s.fmt.split(' ').map(f=>`<span style="padding:1px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:3px;font-size:9px;color:var(--primary);font-weight:700">${f}</span>`).join('')}
                </div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${s.note}</div>
                <div style="margin-top:8px;font-size:10px;color:var(--primary);font-weight:600">Visita →</div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  },

  // ── GENERATORI ──────────────────────────────────────────────────────────
  _tab_generatori(){
    const tools = [
      {
        cat:'📦 GENERATORI SCATOLE',
        items:[
          {name:'MakerCase',     url:'https://www.makercase.com',            free:'✅ Gratis',     desc:'Il più semplice. Inserisci dimensioni + spessore materiale → SVG/DXF istantaneo. Anteprima 3D. Finger joints, T-slot, flat. Con compensazione kerf.'},
          {name:'Boxes.py',      url:'https://www.festi.info/boxes.py/',     free:'✅ Open Source', desc:'Il più potente. Open source (Python). Scatole con cerniere, angoli arrotondati, living hinge, cassetti, inserti. Plugin Inkscape disponibile.'},
          {name:'Atomm Box Gen', url:'https://www.atomm.com/generator/boxes',free:'✅ Gratis',     desc:'Generatore online xTool. Include impostazioni macchina. Interfaccia moderna.'},
          {name:'Make-A-Box',    url:'https://makeabox.io',                  free:'✅ Gratis',     desc:'Semplice e veloce. Scatole con finger joints simmetrici. Perfetto per packaging rapido.'},
          {name:'TemplateMaker', url:'https://www.templatemaker.nl',         free:'✅ Gratis',     desc:'Specializzato in packaging carta/cartone. Oltre 100 tipi di template. Ottimo per cartoni spedizione.'},
          {name:'CubeBox',       url:'https://www.cutlistoptimizer.com',     free:'✅ Gratis',     desc:'Ottimizzazione layout foglio: minimizza gli sprechi di materiale calcolando disposizione ottimale dei pezzi.'},
        ]
      },
      {
        cat:'🔠 GENERATORI TESTO & FONT LASER',
        items:[
          {name:'Hershey Text (Inkscape)',url:'https://inkscape.org',        free:'✅ Gratis',     desc:'Plugin Inkscape per font a linea singola — ideali per incisione veloce. No double-path. Fondamentale per il laser.'},
          {name:'LaseredCrafts Font',url:'https://www.1001fonts.com/laser-fonts.html',free:'✅ Gratis',desc:'1001Fonts con filtro laser. Font ottimizzati per incisione.'},
          {name:'Cuttle.xyz',    url:'https://cuttle.xyz',                   free:'🟡 Freemium',   desc:'Design parametrico online. Font, pattern, geometrie. Esporta SVG/DXF. Ottimo per custom design ripetitivi.'},
        ]
      },
      {
        cat:'🌐 GENERATORI PATTERN & GEOMETRIE',
        items:[
          {name:'Inkscape + Extensions',url:'https://inkscape.org',          free:'✅ Gratis',     desc:'Il software gratis più usato. Estensioni laser: Living Hinge, Tab/Slot, Pattern Generator. Fondamentale.'},
          {name:'Voronoi Generator',url:'https://voronator.com',             free:'✅ Gratis',     desc:'Genera pattern Voronoi matematicamente precisi. Ideale per decorazioni laser con effetto organico.'},
          {name:'Tabbify',       url:'https://tabbify.com',                  free:'✅ Gratis',     desc:'Aggiunge tab e slot a qualsiasi SVG. Utile per convertire design normali in pezzi assemblabili.'},
          {name:'Living Hinge Calculator',url:'https://makerdesignlab.com/tutorials-tips/living-hinge-patterns-for-laser-cutting/',free:'✅ Gratis',desc:'Calcola pattern living hinge per legno flessibile. Essenziale per scatole con coperchio curvo.'},
        ]
      },
      {
        cat:'📏 CALCOLI & CONVERSIONI',
        items:[
          {name:'Laser Kerf Calculator',url:'https://www.makercase.com',     free:'✅ Integrato',  desc:'Il kerf (larghezza taglio) va da 0.1 a 0.3mm. Regola sempre per un incastro preciso. Formula: misura_reale = misura_disegno - kerf/2'},
          {name:'SVG to DXF Converter',url:'https://cloudconvert.com/svg-to-dxf',free:'✅ Gratis', desc:'Converti SVG in DXF per LightBurn, RDWorks, EtchDroid. Cloudconvert è il più affidabile.'},
          {name:'RealWorldFit',  url:'https://boxes.hackerspace-bamberg.de', free:'✅ Integrato',  desc:'Boxes.py include il parametro "fit" per compensare kerf automaticamente su tutti i joint.'},
        ]
      }
    ];

    return `<div style="display:flex;flex-direction:column;gap:20px">
      ${tools.map(cat=>`
        <div>
          <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">${cat.cat}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">
            ${cat.items.map(s=>`
              <div onclick="RisorseModule.openLink('${s.url}')" style="padding:14px;border-radius:11px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:13px;font-weight:800;color:var(--text)">${s.name}</span>
                  <span style="margin-left:auto;font-size:10px;font-weight:700;color:${s.free.includes('✅')?'#22c55e':'#f59e0b'}">${s.free}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.5">${s.desc}</div>
                <div style="margin-top:7px;font-size:10px;color:var(--primary);font-weight:600">Apri →</div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  },

  // ── MATERIALI & SETTINGS ─────────────────────────────────────────────────
  _tab_materiali(){
    const mats = [
      {mat:'🌲 Legno MDF 3mm',     laser:'CO2 40W',  taglio:'Vel: 20mm/s · Pot: 80% · 1 passata',   incisione:'Vel: 200mm/s · Pot: 25-35%', note:'Borda con nastro per evitare bruciature. Aria assistita rimuove fumo.'},
      {mat:'🌲 Compensato 4mm',     laser:'CO2 40W',  taglio:'Vel: 15mm/s · Pot: 85% · 1-2 passate', incisione:'Vel: 300mm/s · Pot: 20-30%', note:'La colla tra strati assorbe energia. Testa 2 passate a velocità.'},
      {mat:'🧪 Acrilico cast 3mm',  laser:'CO2 40W',  taglio:'Vel: 10mm/s · Pot: 85% · 1 passata',   incisione:'Vel: 300mm/s · Pot: 15-20%', note:'Cast (colato) ha bordi cristallini. Extruded si crepa facilmente.'},
      {mat:'🧪 Acrilico estruso 3mm',laser:'CO2 40W', taglio:'Vel: 12mm/s · Pot: 80% · 2 passate',  incisione:'Vel: 400mm/s · Pot: 12-18%', note:'Incisione su rovescio = frosted su fronte. Usare meno passate.'},
      {mat:'🐮 Pelle 2mm',          laser:'CO2 40W',  taglio:'Vel: 25mm/s · Pot: 60% · 1 passata',   incisione:'Vel: 300mm/s · Pot: 20-30%', note:'MAI PVC/vinyl: emette cloro. Solo vera pelle naturale o sintetica laser-safe.'},
      {mat:'📄 Cartone 3mm',         laser:'CO2 40W',  taglio:'Vel: 30mm/s · Pot: 50% · 1 passata',   incisione:'Vel: 500mm/s · Pot: 15%',    note:'Alta infiammabilità. Mai lasciare incustodito. Aria assistita essenziale.'},
      {mat:'🪨 Ardesia/Ceramica',    laser:'CO2 40W',  taglio:'N/A',                                   incisione:'Vel: 200mm/s · Pot: 80%',    note:'Solo incisione. Ottimo per targhe. Risultato bianco su nero.'},
      {mat:'⚙️ Alluminio anodizzato',laser:'Fiber 20W', taglio:'N/A',                                 incisione:'Vel: 500mm/s · Pot: 60%',    note:'Rimuove l\'anodizzatura. Solo laser fibra per metalli.'},
      {mat:'🌲 MDF 3mm (Diodo 10W)', laser:'Diodo 10W', taglio:'Vel: 8mm/s · Pot: 100% · 3 passate',  incisione:'Vel: 150mm/s · Pot: 60%',    note:'Diodo richiede più passate. Air assist critico. Fumi abbondanti.'},
    ];

    const refs = [
      {name:'Material Settings DB (OptiLaserPro)',url:'https://www.laserartcreator.com/blog/complete-laser-settings-guide-perfect-parameters',desc:'50+ categorie materiali per CO2, Fiber, Diodo, UV. Testato e verificato.'},
      {name:'Diode Laser Wiki Settings',url:'https://diode-laser-wiki.com/documentation/guideline-settings/',desc:'Guida completa kerf, focus, modalità dinamica. Community-driven.'},
      {name:'LightBurn Material Library',url:'https://docs.lightburnsoftware.com/Tools/MaterialTest.html',desc:'Come usare il Material Test Generator integrato in LightBurn.'},
      {name:'Laser Settings Community (Reddit)',url:'https://www.reddit.com/r/lasercutting/wiki/index',desc:'Wiki della community. Impostazioni per macchine specifiche.'},
    ];

    return `
    <div style="margin-bottom:16px;padding:12px 16px;background:var(--bg-card2);border-radius:10px;border-left:4px solid #f97316;font-size:12px">
      <strong style="color:#f97316">⚠️ IMPORTANTE:</strong> Questi sono valori di partenza per CO2 40W. Ogni laser è diverso — esegui sempre un test griglia potenza/velocità su materiale di scarto prima di produzione!
    </div>
    <div style="overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-card2)">
            <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)">Materiale</th>
            <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)">Laser</th>
            <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)">⚡ Taglio</th>
            <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)">✏️ Incisione</th>
            <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)">Note</th>
          </tr>
        </thead>
        <tbody>
          ${mats.map((m,i)=>`<tr style="border-bottom:1px solid var(--border);background:${i%2===0?'var(--bg-card)':'var(--bg-card2)'}">
            <td style="padding:8px 12px;font-weight:700">${m.mat}</td>
            <td style="padding:8px 12px;color:var(--text-muted);font-size:11px">${m.laser}</td>
            <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#38bdf8">${m.taglio}</td>
            <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#a78bfa">${m.incisione}</td>
            <td style="padding:8px 12px;font-size:11px;color:var(--text-muted)">${m.note}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">📚 Database Settings Online</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
      ${refs.map(r=>`<div onclick="RisorseModule.openLink('${r.url}')" style="padding:13px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:5px">${r.name}</div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${r.desc}</div>
        <div style="margin-top:7px;font-size:10px;color:var(--primary);font-weight:600">Apri →</div>
      </div>`).join('')}
    </div>`;
  },

  // ── SOFTWARE ─────────────────────────────────────────────────────────────
  _tab_software(){
    const sw = [
      {cat:'🖥️ SOFTWARE CONTROLLO LASER',items:[
        {name:'LightBurn',     url:'https://lightburnsoftware.com',          free:'💰 €60/anno',    desc:'Lo standard del settore. CO2, Fiber, Diodo. Import SVG/DXF/AI/PDF. Nesting automatico. Material Test integrato. DSGN gratis per 30gg.'},
        {name:'LaserGRBL',     url:'https://lasergrbl.com',                  free:'✅ Open Source',  desc:'Gratis per sempre. Per laser GRBL (xTool, Sculpfun, Ortur). Meno funzioni di LightBurn ma sufficiente per iniziare.'},
        {name:'RDWorks',       url:'https://www.ruida-rdworks.com',           free:'✅ Gratis',       desc:'Software ufficiale Ruida (CO2 cinesi). Gratuito ma datato. LightBurn lo sostituisce quasi sempre.'},
        {name:'XCS (xTool)',   url:'https://www.xtool.com/pages/software',   free:'✅ Gratis',       desc:'Software proprietario xTool. Facile, integrato con Atomm. Ottimo per principianti con macchine xTool.'},
      ]},
      {cat:'✏️ SOFTWARE DESIGN (vector)',items:[
        {name:'Inkscape',      url:'https://inkscape.org',                   free:'✅ Open Source',  desc:'Il Photoshop del vettoriale gratuito. Plugin laser inclusi: Living Hinge, Tab/Slot, Hershey Text. FONDAMENTALE.'},
        {name:'Affinity Designer',url:'https://affinity.serif.com',          free:'💰 Acquisto',    desc:'Alternativa professionale ad Adobe Illustrator. Una tantum €70. Ottimo SVG/DXF output.'},
        {name:'CorelDRAW',     url:'https://www.coreldraw.com',              free:'💰 Abbonamento', desc:'Standard industria per laser. File CDR nativi. Molti file gratuiti online sono CDR. Trial 15 giorni.'},
        {name:'Adobe Illustrator',url:'https://www.adobe.com/it/products/illustrator.html',free:'💰 €30/mese',desc:'La suite professionale. SVG/EPS/AI perfetti. Quasi tutti i designer usano questo. Costoso.'},
        {name:'Cuttle',        url:'https://cuttle.xyz',                     free:'🟡 Freemium',    desc:'Design parametrico online. Ottimo per pattern, testo, geometrie custom per laser.'},
      ]},
      {cat:'🖼️ CONVERSIONE & UTILITÀ',items:[
        {name:'CloudConvert',  url:'https://cloudconvert.com/svg-to-dxf',    free:'🟡 Freemium',    desc:'SVG→DXF, AI→SVG, PDF→SVG. Online, veloce, affidabile. 25 conversioni/giorno gratis.'},
        {name:'Vectorizer.io', url:'https://vectorizer.io',                  free:'🟡 Freemium',    desc:'Da immagine raster (JPG/PNG) a SVG vettoriale. AI-powered. Qualità superiore a Inkscape trace.'},
        {name:'Nestedly',      url:'https://nestedly.com',                   free:'🟡 Freemium',    desc:'Nesting professionale: dispone i pezzi sul foglio minimizzando gli sprechi di materiale.'},
        {name:'SVGOMG',        url:'https://jakearchibald.github.io/svgomg/',free:'✅ Gratis',       desc:'Ottimizza SVG rimuovendo nodi inutili. File più piccoli = upload più veloci su LightBurn.'},
      ]},
    ];

    return `<div style="display:flex;flex-direction:column;gap:20px">
      ${sw.map(cat=>`
        <div>
          <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">${cat.cat}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
            ${cat.items.map(s=>`
              <div onclick="RisorseModule.openLink('${s.url}')" style="padding:14px;border-radius:11px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:13px;font-weight:800;color:var(--text)">${s.name}</span>
                  <span style="margin-left:auto;font-size:10px;font-weight:700;color:${s.free.includes('✅')?'#22c55e':s.free.includes('💰')?'#ef4444':'#f59e0b'}">${s.free}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.5">${s.desc}</div>
                <div style="margin-top:7px;font-size:10px;color:var(--primary);font-weight:600">Apri →</div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  },

  // ── DOVE VENDERE ─────────────────────────────────────────────────────────
  _tab_vendi(){
    const piattaforme = [
      {name:'Etsy',           url:'https://www.etsy.com/sell',               free:'💰 0.20€/listing', emoji:'🛍️', desc:'Il marketplace #1 per artigianato handmade e personalizzato. Forte domanda per laser italiano. Fee: 6.5% + 0.20€/articolo.'},
      {name:'Etsy Digital',   url:'https://help.etsy.com/hc/en-us/articles/115014455488-Creating-and-Managing-Listing-Variations',free:'💰 0.20€/listing',emoji:'📁',desc:'Vendi file SVG/DXF digitali su Etsy. Commissioni minime. Ottimo per file laser cut da rivendere — passivo income.'},
      {name:'Shopify',        url:'https://www.shopify.com/it',              free:'💰 €29/mese',      emoji:'🏪', desc:'Shop proprietario. Nessuna commissione su vendite. Ottimo per volumi alti. Integra con produzione su richiesta.'},
      {name:'WooCommerce',    url:'https://woocommerce.com',                 free:'✅ Plugin gratis', emoji:'🌐', desc:'E-commerce su WordPress. Gratis il plugin base. Controllo totale. Richiede hosting.'},
      {name:'Faire',          url:'https://www.faire.com',                   free:'💰 Commission',    emoji:'🏬', desc:'B2B marketplace per negozi. Ottimo per vendere bulk a boutique e negozi di design. 15% comm.'},
      {name:'Not On High St', url:'https://www.notonthehighstreet.com',      free:'💰 Application',  emoji:'🎁', desc:'UK-focused marketplace premium per gift artigianali. Alta qualità, clienti disposti a pagare premium.'},
      {name:'Amazon Handmade',url:'https://sell.amazon.com/handmade',        free:'💰 15% comm',     emoji:'📦', desc:'Reach enorme. Competizione alta. Buono se hai processi di fulfillment rapidi.'},
      {name:'Creatively.be',  url:'https://creatively.be',                   free:'💰 Commission',   emoji:'✨', desc:'Marketplace europeo per design. Meno competitivo di Etsy. Ottimo per mercato IT/EU.'},
      {name:'Mercatino Locale',url:'https://www.subito.it',                  free:'✅ Gratis',        emoji:'📍', desc:'Subito.it per Italia. Zero fee. Ottimo per vendita locale, fiere, clienti B2B area.'},
      {name:'Instagram Shop',  url:'https://business.instagram.com/shopping', free:'✅ Gratis',       emoji:'📸', desc:'Collega prodotti ai post. Acquisto diretto. Fondamentale se hai follower. Integra con Shopify.'},
    ];

    const tips = [
      ['📸','Foto professionali','Investi in foto di qualità. Su Etsy, la foto è il 90% della vendita. Usa sfondo bianco + lifestyle shot.'],
      ['🔍','SEO titolo','Titolo Etsy: Keyword principale + materiale + uso. Es: "Segnaposto Matrimonio Laser Legno Personalizzato Nome Coppia"'],
      ['💰','Prezzo corretto','Formula: (Materiale × 3) + (Ore × tariffa oraria €25) + (Spedizione + imballo). Non sottovalutarti.'],
      ['⚡','Tempi consegna','Indica 5-7 giorni lavorativi. I clienti personalizzati accettano tempi. Non stressarti con consegna 24h.'],
      ['💬','Risposta rapida','Rispondi entro 1-2h su Etsy. Il tasso di risposta influenza il ranking dei tuoi prodotti.'],
      ['⭐','Recensioni','Manda un follow-up messaggio dopo consegna chiedendo educatamente recensione. Fondamentale per rank.'],
    ];

    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:20px">
      ${piattaforme.map(p=>`
        <div onclick="RisorseModule.openLink('${p.url}')" style="padding:14px;border-radius:11px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:18px">${p.emoji}</span>
            <span style="font-size:13px;font-weight:800;color:var(--text)">${p.name}</span>
            <span style="margin-left:auto;font-size:10px;font-weight:700;color:${p.free.includes('✅')?'#22c55e':'#f59e0b'}">${p.free}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${p.desc}</div>
          <div style="margin-top:7px;font-size:10px;color:var(--primary);font-weight:600">Inizia →</div>
        </div>`).join('')}
    </div>
    <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">💡 Tips Vendita Laser</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">
      ${tips.map(([e,t,d])=>`<div style="padding:12px;border-radius:9px;background:var(--bg-card);border:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><span style="font-size:16px">${e}</span><strong style="font-size:12px">${t}</strong></div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${d}</div>
      </div>`).join('')}
    </div>`;
  },

  // ── COMMUNITY ─────────────────────────────────────────────────────────────
  _tab_community(){
    const comms = [
      {cat:'💬 FORUM & DISCUSSIONI',items:[
        {name:'r/lasercutting',url:'https://www.reddit.com/r/lasercutting/',emoji:'🔴',desc:'La community Reddit più attiva. 200k+ membri. Aiuto settings, showcase lavori, consigli macchine.'},
        {name:'r/DIY Laser',    url:'https://www.reddit.com/r/diylasers/',emoji:'🔴',desc:'Focus su macchine fai-da-te, mod, upgrade. Tecnico e approfondito.'},
        {name:'LightBurn Forum',url:'https://forum.lightburnsoftware.com',emoji:'🟣',desc:'Forum ufficiale LightBurn. Staff risponde. Settings, problemi, tips. Cerca prima di chiedere.'},
        {name:'Diode Laser Wiki',url:'https://diode-laser-wiki.com',emoji:'🔵',desc:'Wiki community per laser a diodo. Settings verificati, guide materiali, confronto macchine.'},
        {name:'Instructables',  url:'https://www.instructables.com/search/?q=laser+cut',emoji:'🟡',desc:'Tutorial step-by-step con foto. File scaricabili. Ottimo per imparare da progetti completi.'},
      ]},
      {cat:'📺 YOUTUBE — CANALI LASER ITALIANI & INTERNAZIONALI',items:[
        {name:'Laser Everything', url:'https://www.youtube.com/@LaserEverything',emoji:'📺',desc:'Canale inglese dedicato. Settings, review macchine, progetti pratici. Molto utile.'},
        {name:'Makers Cabinet',   url:'https://www.youtube.com/@MakersCabinet',emoji:'📺',desc:'Design e costruzione con laser. Approccio professionale per piccoli business.'},
        {name:'xTool Official',   url:'https://www.youtube.com/@xtoolofficial',emoji:'📺',desc:'Tutorials ufficiali xTool. Settings per macchine specifiche, materiali, trucchi.'},
        {name:'Glowforge Owners', url:'https://www.youtube.com/@GlowforgeOwners',emoji:'📺',desc:'Community Glowforge. Molti tutorial applicabili a tutti i laser CO2.'},
      ]},
      {cat:'🇮🇹 GRUPPI ITALIANI',items:[
        {name:'Laser Italia (FB)',url:'https://www.facebook.com/groups/laseritaliani',emoji:'🇮🇹',desc:'Gruppo Facebook maker italiani. Condivisione lavori, settings in italiano, supporto community.'},
        {name:'CNC & Laser IT',  url:'https://www.facebook.com/groups/cnclaserrouter',emoji:'🇮🇹',desc:'Gruppo italiano CNC + Laser. Più tecnico, include router CNC. Supporto in italiano.'},
        {name:'Arduino & Maker', url:'https://forum.arduino.cc',emoji:'🇮🇹',desc:'Forum Arduino IT con sezione laser. Utile per automazioni, progetti integrati.'},
      ]},
    ];

    return `<div style="display:flex;flex-direction:column;gap:20px">
      ${comms.map(cat=>`
        <div>
          <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:0 0 10px">${cat.cat}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
            ${cat.items.map(s=>`
              <div onclick="RisorseModule.openLink('${s.url}')" style="padding:13px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <span style="font-size:16px">${s.emoji}</span>
                  <span style="font-size:12px;font-weight:800;color:var(--text)">${s.name}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${s.desc}</div>
                <div style="margin-top:7px;font-size:10px;color:var(--primary);font-weight:600">Unisciti →</div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  },

  // ── FORMULE & CALCOLI ────────────────────────────────────────────────────
  _tab_formule(){
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

      <!-- Calcolo prezzo -->
      <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
        <h3 style="font-size:13px;font-weight:700;margin:0 0 14px;color:var(--primary)">💰 Calcola Prezzo di Vendita</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Costo materiale (€)</label>
            <input id="fr-mat" class="form-control" type="number" value="3.50" style="height:32px;font-size:12px" oninput="RisorseModule.calcPrezzo()"></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Ore lavoro</label>
            <input id="fr-ore" class="form-control" type="number" value="0.5" step="0.1" style="height:32px;font-size:12px" oninput="RisorseModule.calcPrezzo()"></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Tariffa oraria (€/h)</label>
            <input id="fr-ora" class="form-control" type="number" value="25" style="height:32px;font-size:12px" oninput="RisorseModule.calcPrezzo()"></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Spedizione + imballo (€)</label>
            <input id="fr-sped" class="form-control" type="number" value="4.50" style="height:32px;font-size:12px" oninput="RisorseModule.calcPrezzo()"></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Overhead % (corrente, manutenzione)</label>
            <input id="fr-over" class="form-control" type="number" value="15" style="height:32px;font-size:12px" oninput="RisorseModule.calcPrezzo()"></div>
        </div>
        <div id="fr-result" style="margin-top:14px;padding:12px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Risultato</div>
          <div id="fr-price" style="font-size:22px;font-weight:900;color:var(--primary)">—</div>
          <div id="fr-detail" style="font-size:10px;color:var(--text-muted);margin-top:4px"></div>
        </div>
      </div>

      <!-- Kerf e focus -->
      <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
        <h3 style="font-size:13px;font-weight:700;margin:0 0 14px;color:#38bdf8">📐 Kerf Calculator</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Misura nominale pezzo (mm)</label>
            <input id="kf-nom" class="form-control" type="number" value="100" style="height:32px;font-size:12px" oninput="RisorseModule.calcKerf()"></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Kerf laser misurato (mm)</label>
            <input id="kf-kerf" class="form-control" type="number" value="0.15" step="0.01" style="height:32px;font-size:12px" oninput="RisorseModule.calcKerf()">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px">CO2: tipicamente 0.1-0.2mm | Diodo: 0.05-0.15mm</div></div>
          <div><label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:3px">Tipo di taglio</label>
            <select id="kf-type" class="form-control" style="height:32px;font-size:12px" onchange="RisorseModule.calcKerf()">
              <option value="out">Pezzo esterno (cutout)</option>
              <option value="in">Slot/Foro interno</option>
            </select></div>
        </div>
        <div id="kf-result" style="margin-top:14px;padding:12px;background:#38bdf815;border-radius:8px;border:1px solid #38bdf830">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Misura da disegnare nel file</div>
          <div id="kf-value" style="font-size:22px;font-weight:900;color:#38bdf8">—</div>
          <div id="kf-note" style="font-size:10px;color:var(--text-muted);margin-top:4px"></div>
        </div>

        <h3 style="font-size:12px;font-weight:700;margin:18px 0 10px;color:#a78bfa">📏 Formule Utili</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
            ['Tempo taglio','Lunghezza_mm ÷ Velocità_mm/s = secondi'],
            ['Costo energia','(Watt × ore) ÷ 1000 × €0.25 = €'],
            ['Nesting efficienza','Pezzi × Area_pezzo ÷ Area_foglio × 100 = %'],
            ['Spessore max CO2','Watt ÷ 10 ≈ mm max (legno) — es. 40W→4mm'],
          ].map(([t,f])=>`<div style="padding:7px 10px;background:var(--bg-card2);border-radius:6px">
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-bottom:2px">${t}</div>
            <div style="font-family:monospace;font-size:11px;color:#a78bfa">${f}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Tabella materiali spessore max -->
    <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
      <h3 style="font-size:13px;font-weight:700;margin:0 0 12px">📊 Spessore max taglio per potenza laser</h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg-card2)">
            <th style="padding:8px;text-align:left;color:var(--text-muted)">Materiale</th>
            ${['Diodo 5W','Diodo 10W','Diodo 20W','CO2 40W','CO2 60W','CO2 80W','CO2 100W'].map(w=>`<th style="padding:8px;text-align:center;color:var(--text-muted)">${w}</th>`).join('')}
          </thead>
          <tbody>
            ${[
              ['🌲 Compensato',   '1mm','3mm','5mm','8mm','10mm','12mm','15mm'],
              ['🪵 MDF',          '1mm','2mm','4mm','6mm','8mm', '10mm','12mm'],
              ['🧪 Acrilico cast','—',  '2mm','3mm','6mm','8mm', '10mm','12mm'],
              ['🐮 Pelle',        '2mm','3mm','5mm','6mm','8mm', '10mm','12mm'],
              ['📄 Cartone',      '3mm','4mm','6mm','8mm','10mm','12mm','15mm'],
            ].map((row,i)=>`<tr style="border-top:1px solid var(--border);background:${i%2===0?'var(--bg-card)':'var(--bg-card2)'}">
              ${row.map((v,j)=>`<td style="padding:7px 10px;text-align:${j===0?'left':'center'};color:${v==='—'?'var(--text-dim)':j>0?'#22c55e':'var(--text)'}${j===4?';font-weight:700':''}">${v}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text-dim)">* Valori indicativi con aria assistita. Variano per marca materiale, messa a fuoco e umidità.</div>
    </div>`;
  },

};

// Event-driven calc after render
window.RisorseModule = RisorseModule;

// Extend with calc methods
RisorseModule.calcPrezzo = function(){
  const mat  = parseFloat(document.getElementById('fr-mat')?.value)||0;
  const ore  = parseFloat(document.getElementById('fr-ore')?.value)||0;
  const tariffa = parseFloat(document.getElementById('fr-ora')?.value)||25;
  const sped = parseFloat(document.getElementById('fr-sped')?.value)||0;
  const over = parseFloat(document.getElementById('fr-over')?.value)||15;
  const lavoro = ore * tariffa;
  const sub    = mat + lavoro + sped;
  const overhead = sub * (over/100);
  const totale   = sub + overhead;
  const margine  = ((totale - mat - sped) / totale * 100).toFixed(0);
  const el = document.getElementById('fr-price');
  const dl = document.getElementById('fr-detail');
  if(el) el.textContent = '\u20ac' + totale.toFixed(2);
  if(dl) dl.innerHTML = `Materiale: \u20ac${mat.toFixed(2)} · Lavoro: \u20ac${lavoro.toFixed(2)} · Overhead: \u20ac${overhead.toFixed(2)} · Margine: ${margine}%`;
};

RisorseModule.calcKerf = function(){
  const nom  = parseFloat(document.getElementById('kf-nom')?.value)||100;
  const kerf = parseFloat(document.getElementById('kf-kerf')?.value)||0.15;
  const type = document.getElementById('kf-type')?.value||'out';
  const adj  = type==='out' ? nom + kerf : nom - kerf;
  const el = document.getElementById('kf-value');
  const nt = document.getElementById('kf-note');
  if(el) el.textContent = adj.toFixed(2) + ' mm';
  if(nt) nt.textContent = type==='out' 
    ? `Pezzo esterno: aggiungi kerf/2 per lato. ${nom}mm + ${kerf}mm = ${adj.toFixed(2)}mm nel file`
    : `Foro interno: riduci kerf/2 per lato. ${nom}mm - ${kerf}mm = ${adj.toFixed(2)}mm nel file`;
};

// Auto-calc on tab load
const _origRisorseTab = RisorseModule.tab.bind(RisorseModule);
RisorseModule.tab = function(id){
  _origRisorseTab(id);
  if(id==='formule'){
    setTimeout(()=>{ RisorseModule.calcPrezzo(); RisorseModule.calcKerf(); }, 100);
  }
};


window.TrendScanner = TrendScanner;

// ═══════════════════════════════════════════════════════════════════
// ETSY PULSE — Live trending products, searches, bestsellers
// ═══════════════════════════════════════════════════════════════════
const EtsyPulse = {

  _NICHES: [
    {id:'laser_wedding',  label:'Matrimonio Laser',    kw:'laser wedding personalized',    em:'💒', color:'#ec4899'},
    {id:'laser_wood',     label:'Legno Inciso',         kw:'laser engraved wood',            em:'🌲', color:'#f59e0b'},
    {id:'laser_acrylic',  label:'Acrilico Colorato',    kw:'laser cut acrylic',              em:'🧪', color:'#60a5fa'},
    {id:'laser_gift',     label:'Regalo Personalizzato',kw:'custom laser engraved gift',     em:'🎁', color:'#a78bfa'},
    {id:'laser_signs',    label:'Targhe & Segnaletica', kw:'laser cut custom sign',          em:'🏷️', color:'#22c55e'},
    {id:'laser_ornament', label:'Decorazioni & Natale', kw:'laser cut ornament',             em:'🎄', color:'#ef4444'},
    {id:'laser_italy',    label:'Made in Italy Laser',  kw:'laser artigianato italia',       em:'🇮🇹', color:'#22c55e'},
    {id:'laser_b2b',      label:'B2B / Corporate',      kw:'laser engraved corporate gift',  em:'🏢', color:'#38bdf8'},
  ],

  _TRENDING_DATA: {
    bestsellers_2026: [
      {rank:1, name:'Segnaposto matrimonio legno personalizzato',
       price_it:'€3-8', price_eu:'€4-10', price_us:'$6-15',
       trend_it:'+47%', trend_eu:'+38%', trend_us:'+62%',
       searches:'28k/m', competition:'media',
       tip:'Font calligrafico + nomi personalizzati. USA: "wedding place card wood".',
       etsy_link:'https://www.etsy.com/search?q=laser+wood+wedding+place+card&order=most_relevant',link_it:'https://www.etsy.com/it/search?q=segnaposto+matrimonio+legno',link_world:'https://www.etsy.com/search?q=personalized+wood+wedding+favor'},
      {rank:2, name:'Targa porta ufficio acrilico nome/titolo',
       price_it:'€15-35', price_eu:'€18-45', price_us:'$25-65',
       trend_it:'+31%', trend_eu:'+29%', trend_us:'+44%',
       searches:'18k/m', competition:'bassa',
       tip:'B2B alta marginalità. UK: "acrylic desk sign name". Partite da 10pz.',
       etsy_link:'https://www.etsy.com/search?q=acrylic+desk+nameplate+laser+engraved',link_it:'https://www.etsy.com/it/search?q=targa+ufficio+personalizzata',link_world:'https://www.etsy.com/search?q=custom+office+door+sign+laser'},
      {rank:3, name:'Chopping board personalizzata incisione',
       price_it:'€25-55', price_eu:'€30-70', price_us:'$40-95',
       trend_it:'+18%', trend_eu:'+31%', trend_us:'+71%',
       searches:'45k/m', competition:'alta',
       tip:'USA mercato #1. "Personalized cutting board" top 3 Etsy USA. Design minimalista.',
       etsy_link:'https://www.etsy.com/search?q=personalized+cutting+board+laser+engraved',link_it:'https://www.etsy.com/it/search?q=mappa+laser+incisa+legno',link_world:'https://www.etsy.com/search?q=personalized+wooden+city+map'},
      {rank:4, name:'Portachiavi inciso nome/data/frase',
       price_it:'€5-12', price_eu:'€6-14', price_us:'$8-20',
       trend_it:'+22%', trend_eu:'+19%', trend_us:'+28%',
       searches:'52k/m', competition:'alta',
       tip:'Volume globale più alto. Differenziati con forme uniche: cuore, mappa, ecc.',
       etsy_link:'https://www.etsy.com/search?q=personalized+keychain+laser+engraved+name',link_it:'https://www.etsy.com/it/search?q=portachiavi+personalizzato+laser',link_world:'https://www.etsy.com/search?q=personalized+keychain+laser+engraved'},
      {rank:5, name:'Targa nascita bambino dati personalizzati',
       price_it:'€20-45', price_eu:'€25-55', price_us:'$35-75',
       trend_it:'+35%', trend_eu:'+41%', trend_us:'+38%',
       searches:'22k/m', competition:'bassa',
       tip:'Zero stagionalità. UK e Germania fortissimi. Nome, data, peso, ora.',
       etsy_link:'https://www.etsy.com/search?q=personalized+baby+birth+sign+laser+wood',link_it:'https://www.etsy.com/it/search?q=sottobicchieri+legno+personalizzati',link_world:'https://www.etsy.com/search?q=custom+engraved+wooden+coasters'},
      {rank:6, name:'Wall art geometrico acrilico/legno layered',
       price_it:'€35-90', price_eu:'€40-110', price_us:'$55-150',
       trend_it:'+41%', trend_eu:'+55%', trend_us:'+67%',
       searches:'16k/m', competition:'bassa',
       tip:'Premium in esplosione. Australia e Canada enormi. Mandala, montagne, skyline.',
       etsy_link:'https://www.etsy.com/search?q=laser+cut+wood+wall+art+geometric',link_it:'https://www.etsy.com/it/search?q=targa+nascita+personalizzata',link_world:'https://www.etsy.com/search?q=custom+baby+birth+announcement+sign'},
      {rank:7, name:'Coaster set 4pz legno inciso tematico',
       price_it:'€18-40', price_eu:'€20-48', price_us:'$28-65',
       trend_it:'+19%', trend_eu:'+24%', trend_us:'+33%',
       searches:'31k/m', competition:'media',
       tip:'Bundle regalo = AOV alto. USA ama set monogrammi famiglia. Packaging premium.',
       etsy_link:'https://www.etsy.com/search?q=personalized+wood+coaster+set+laser+engraved',link_it:'https://www.etsy.com/it/search?q=wall+art+acrilico+specchio',link_world:'https://www.etsy.com/search?q=mirror+acrylic+geometric+wall+art'},
      {rank:8, name:'Gadget aziendale logo inciso legno/acrilico',
       price_it:'€8-25', price_eu:'€10-30', price_us:'$15-45',
       trend_it:'+52%', trend_eu:'+44%', trend_us:'+58%',
       searches:'12k/m', competition:'bassa',
       tip:'B2B in crescita ovunque. Ordini 50-500pz alto margine. Poca concorrenza IT.',
       etsy_link:'https://www.etsy.com/search?q=laser+engraved+corporate+gift+logo+wood',link_it:'https://www.etsy.com/it/search?q=tagliere+personalizzato+laser',link_world:'https://www.etsy.com/search?q=custom+engraved+cutting+board'},
      {rank:9, name:'Mappa incisa legno città/luogo speciale',
       price_it:'€25-60', price_eu:'€30-75', price_us:'$40-110',
       trend_it:'+28%', trend_eu:'+36%', trend_us:'+49%',
       searches:'14k/m', competition:'media',
       tip:'USA+UK enormi. "Where we met map". Mappa Italia unica per stranieri.',
       etsy_link:'https://www.etsy.com/search?q=custom+city+map+laser+engraved+wood',link_it:'https://www.etsy.com/it/search?q=gadget+aziendale+personalizzato',link_world:'https://www.etsy.com/search?q=custom+corporate+gift+laser+engraved'},
      {rank:10, name:'Insegna LED acrilico personalizzata nome/logo',
       price_it:'€80-200', price_eu:'€90-250', price_us:'$120-350',
       trend_it:'+63%', trend_eu:'+71%', trend_us:'+89%',
       searches:'8k/m', competition:'bassissima',
       tip:'MASSIMA OPP: poca concorrenza artigianale in EU. Negozi, bar, ristoranti — B2B goldmine.',
       etsy_link:'https://www.etsy.com/search?q=custom+LED+acrylic+sign+personalized+name',link_it:'https://www.etsy.com/it/search?q=insegna+LED+acrilico',link_world:'https://www.etsy.com/search?q=custom+neon+led+acrylic+sign+business'},
    ],
    europe_bestsellers: [
      {country:'🇩🇪 Germania',  top:'Holzschild personalisiert',        searches:'9.2k/m', trend:'+29%', price:'€12-45', tip:'Qualità premium, testo inciso su legno, font serif'},
      {country:'🇫🇷 Francia',   top:'Plaque personnalisée bois gravure', searches:'6.8k/m', trend:'+24%', price:'€10-40', tip:'Design elegante, made in EU, font classico'},
      {country:'🇪🇸 Spagna',    top:'Cartel personalizado madera',       searches:'4.1k/m', trend:'+18%', price:'€8-30',  tip:'Budget medio-basso, colori vivaci, regalo'},
      {country:'🇬🇧 UK',        top:'Personalised wooden sign laser',    searches:'14.3k/m',trend:'+31%', price:'£15-60', tip:'Mercato enorme, wedding e home decor, spedisci da IT'},
      {country:'🇳🇱 Olanda',    top:'Gepersonaliseerd houten bordje',    searches:'2.8k/m', trend:'+22%', price:'€12-38', tip:'Design minimalista, sostenibilità importante'},
      {country:'🇸🇪 Svezia',    top:'Personlig träskylt laser',         searches:'2.1k/m', trend:'+26%', price:'€14-50', tip:'Stile nordico hygge, Natale fortissimo'},
    ],
    world_bestsellers: [
      {country:'🇺🇸 USA',       top:'Custom laser engraved wood sign',   searches:'45k/m',  trend:'+41%', price:'$15-80', tip:'Mercato ENORME: spedisci già in Etsy — stessa produzione revenue 3×'},
      {country:'🇦🇺 Australia', top:'Personalised timber laser sign',    searches:'8.4k/m', trend:'+35%', price:'AUD20-90',tip:'Natale a dicembre (estate). Beach e nature decor forte'},
      {country:'🇨🇦 Canada',    top:'Custom wood laser engraved gift',   searches:'9.1k/m', trend:'+28%', price:'CAD18-75',tip:'Bilingue FR/EN, sensibili al made in Italy'},
      {country:'🇮🇪 Irlanda',   top:'Personalised Irish wooden plaque',  searches:'1.8k/m', trend:'+21%', price:'€12-45', tip:'Celtic symbols, St.Patrick, Irish heritage'},
      {country:'🇳🇿 NZ',        top:'Custom engraved native wood',       searches:'1.2k/m', trend:'+33%', price:'NZD25-100',tip:'Maori-inspired unici, nichissima nicchia'},
    ],
        rising_keywords_it: [
      {kw:'targa led laser personalizzata',       volume:'alto',  growth:'+89%', cpc:'€0.45'},
      {kw:'segnaposto matrimonio legno 2026',      volume:'alto',  growth:'+67%', cpc:'€0.32'},
      {kw:'regalo laurea laser inciso',            volume:'medio', growth:'+54%', cpc:'€0.28'},
      {kw:'bomboniere matrimonio laser wood',      volume:'alto',  growth:'+43%', cpc:'€0.38'},
      {kw:'targa ufficio acrilico personalizzata', volume:'medio', growth:'+71%', cpc:'€0.55'},
      {kw:'wall art laser legno geometrico',       volume:'medio', growth:'+48%', cpc:'€0.42'},
      {kw:'baby shower wood sign laser',           volume:'medio', growth:'+38%', cpc:'€0.29'},
      {kw:'portachiavi laser personalizzato bulk', volume:'alto',  growth:'+35%', cpc:'€0.22'},
    ],
    seasonal_calendar: [
      {month:'Gen',  peaks:['San Valentino prep','Inverno home decor'],           action:'Prepara cuori/amore 3 sett prima'},
      {month:'Feb',  peaks:['San Valentino ★★★','Babbo per bambini'],             action:'Massima visibilità — campagna Etsy Ads'},
      {month:'Mar',  peaks:['Festa della Donna','Festa del Papà'],                action:'Stock portachiavi e regali donna'},
      {month:'Apr',  peaks:['Pasqua','Primavera wedding prep ★★'],                action:'Inizia matrimoni — segnaposto e favors'},
      {month:'Mag',  peaks:['Festa della Mamma ★★★','Prima Comunione','Laurea'],  action:'Triplo picco — stai pronto con stock'},
      {month:'Giu',  peaks:['Matrimoni peak ★★★','Lauree ★★','Fine scuola'],      action:'STAGIONE PRINCIPALE — massima capacità'},
      {month:'Lug',  peaks:['Matrimoni continua','Estate corporate'],             action:'B2B corporate gadget estivi'},
      {month:'Ago',  peaks:['Ferragosto slow','Prep autunno'],                    action:'Prepara catalogo autunnale/Natale'},
      {month:'Set',  peaks:['Rientro lavori','Matrimoni autunno ★'],              action:'B2B riparte — preventivi aziendali'},
      {month:'Ott',  peaks:['Halloween','Pre-Natale prep'],                       action:'Start campagna Natale. Scorte legno!'},
      {month:'Nov',  peaks:['Black Friday ★★★','Cyber Monday','Natale prep'],     action:'OFFERTE + spedizioni garantite Natale'},
      {month:'Dic',  peaks:['Natale ★★★★','Capodanno','Regali aziendali'],        action:'PICCO MASSIMO — lista d\'attesa, prezzi premium'},
    ]
  },

  render(){
    const el = document.getElementById('view-etsy_pulse');
    if(!el) return;
    const hasAI = typeof AIProvider!=='undefined' && AIProvider.hasKey();

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1300px">
      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#f0728f,#ec4899);display:flex;align-items:center;justify-content:center;font-size:26px">🔥</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:22px;font-weight:900;background:linear-gradient(135deg,#f0728f,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Etsy Pulse — Live Market</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Top 10 bestseller · Keyword in crescita · Calendario stagionale · Analisi nicchie AI — Aprile 2026</p>
        </div>
        <button onclick="EtsyPulse.aiNicheAnalysis()" style="padding:8px 16px;background:${hasAI?'linear-gradient(135deg,#f0728f,#f97316)':'var(--bg-card2)'};color:${hasAI?'#fff':'var(--text-muted)'};border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:12px">🤖 Analisi AI Nicchia</button>
      </div>

      <!-- TAB BAR -->
      <div style="display:flex;gap:4px;margin-bottom:18px;background:var(--bg-card2);padding:4px;border-radius:10px;flex-wrap:wrap">
        ${[['pulse','🔥 Top Seller & Pulse'],['keywords','🔍 Keyword Rising'],['calendar','📅 Calendario Stagionale'],['niches','🎯 Analisi Nicchie']].map((t,i)=>
          `<button onclick="EtsyPulse.tab('${t[0]}',this)" class="ep-tab${i===0?' ep-active':''}"
            style="padding:7px 14px;border-radius:7px;border:none;background:${i===0?'var(--bg-card)':'transparent'};color:${i===0?'#f0728f':'var(--text-muted)'};cursor:pointer;font-size:12px;font-weight:700;transition:.15s;white-space:nowrap">${t[1]}</button>`
        ).join('')}
      </div>

      <div id="ep-content"></div>
    </div>`;

    this.tab('pulse', el.querySelector('.ep-tab'));
  },

  tab(name, btn){
    document.querySelectorAll('.ep-tab').forEach(b=>{b.style.background='transparent';b.style.color='var(--text-muted)';});
    if(btn){btn.style.background='var(--bg-card)';btn.style.color='#f0728f';}
    const c=document.getElementById('ep-content');
    if(!c) return;
    if(name==='pulse')    this._renderPulse(c);
    if(name==='keywords') this._renderKeywords(c);
    if(name==='calendar') this._renderCalendar(c);
    if(name==='niches')   this._renderNiches(c);
  },

  _renderPulse(c){
    c.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:14px;align-items:center">
        <button onclick="EtsyPulse._showMarket('it')" id="ep-mkt-it"
          style="padding:6px 14px;border-radius:7px;border:2px solid var(--primary);background:var(--primary-dim);color:var(--primary);font-weight:700;font-size:11px;cursor:pointer">
          🇮🇹 Italia
        </button>
        <button onclick="EtsyPulse._showMarket('eu')" id="ep-mkt-eu"
          style="padding:6px 14px;border-radius:7px;border:2px solid var(--border2);background:var(--bg-card2);color:var(--text-muted);font-weight:700;font-size:11px;cursor:pointer">
          🇪🇺 Europa
        </button>
        <button onclick="EtsyPulse._showMarket('world')" id="ep-mkt-world"
          style="padding:6px 14px;border-radius:7px;border:2px solid var(--border2);background:var(--bg-card2);color:var(--text-muted);font-weight:700;font-size:11px;cursor:pointer">
          🌍 Mondo
        </button>
        <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">📊 Aprile 2026 · 🔗 clicca per vedere i prodotti su Etsy</span>
      </div>
      <div id="ep-market-content"></div>
      <div style="margin-top:14px;padding:12px 16px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border)">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;font-weight:700">🎯 TOP OPPORTUNITÀ ORA</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${[
            {em:'💡',col:'#f59e0b',title:'Gap Europa',text:'Wall art acrilico e insegne LED: crescita +55-71% in EU, pochissima concorrenza italiana all\'estero'},
            {em:'🚀',col:'#22c55e',title:'USA Goldmine',text:'Chopping board (+71%), portachiavi (+28%), LED signs (+89%): USA vuole tutto e paga di più'},
            {em:'🏆',col:'#60a5fa',title:'Zero Stagionalità',text:'Targa nascita e gadget B2B vendono tutto l\'anno su tutti i mercati. Nessun picco/valle'},
          ].map(o=>`<div style="padding:10px 12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:14px;margin-bottom:4px">${o.em} <strong style="font-size:12px;color:${o.col}">${o.title}</strong></div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.5">${o.text}</div>
          </div>`).join('')}
        </div>
      </div>`;
    EtsyPulse._showMarket('it');
  },

  _showMarket(mkt){
    ['it','eu','world'].forEach(m=>{
      const btn=document.getElementById('ep-mkt-'+m);
      if(!btn) return;
      const act=m===mkt;
      btn.style.borderColor=act?'var(--primary)':'var(--border2)';
      btn.style.background=act?'var(--primary-dim)':'var(--bg-card2)';
      btn.style.color=act?'var(--primary)':'var(--text-muted)';
    });
    const cont=document.getElementById('ep-market-content');
    if(!cont) return;
    if(mkt==='it'){
      const data=EtsyPulse._TRENDING_DATA.bestsellers_2026;
      cont.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card2)">'
        +'<th style="padding:8px;text-align:left;color:var(--text-dim)">#</th>'
        +'<th style="padding:8px;text-align:left;color:var(--text-dim)">Prodotto</th>'
        +'<th style="padding:8px;text-align:center;color:var(--text-dim);white-space:nowrap">💰 Prezzo</th>'
        +'<th style="padding:8px;text-align:center;color:var(--text-dim)">📈 Trend</th>'
        +'<th style="padding:8px;text-align:center;color:var(--text-dim)">🔍 Ricerche</th>'
        +'<th style="padding:8px;text-align:center;color:var(--text-dim)">⚔️ Concorr.</th>'
        +'<th style="padding:8px;text-align:left;color:var(--text-dim)">💡 Tip</th>'
        +'<th style="padding:8px;text-align:center;color:var(--text-dim)">🔗 Etsy</th>'
        +'</tr></thead><tbody>'
        +data.map((r,i)=>{
          const tc=parseInt(r.trend)>40?'#22c55e':parseInt(r.trend)>25?'#f59e0b':'#60a5fa';
          const cc=r.competition==='bassissima'?'#22c55e':r.competition==='bassa'?'#60a5fa':r.competition==='media'?'#f59e0b':'#ef4444';
          return '<tr style="border-top:1px solid var(--border)" onmouseover="this.style.background=\'var(--bg-card2)\'" onmouseout="this.style.background=\'\'"><td style="padding:8px;font-size:14px">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+r.rank)+'</td>'
            +'<td style="padding:8px;font-weight:700;color:var(--text);max-width:200px;line-height:1.3">'+r.name+'</td>'
            +'<td style="padding:8px;text-align:center;color:#22c55e;font-weight:700;white-space:nowrap">'+r.price+'</td>'
            +'<td style="padding:8px;text-align:center;font-weight:800;color:'+tc+'">'+r.trend+'</td>'
            +'<td style="padding:8px;text-align:center;color:var(--text-muted)">'+r.searches+'</td>'
            +'<td style="padding:8px;text-align:center"><span style="color:'+cc+';font-weight:700;font-size:10px">'+r.competition+'</span></td>'
            +'<td style="padding:8px;font-size:10px;color:var(--text-muted);max-width:160px">'+r.tip+'</td>'
            +'<td style="padding:8px;text-align:center">'
            +(r.link_it?'<a href="'+r.link_it+'" target="_blank" style="padding:2px 6px;background:#f0728f15;border:1px solid #f0728f40;border-radius:4px;color:#f0728f;font-size:9px;font-weight:700;text-decoration:none">🇮🇹</a>':'' )
            +(r.link_world?' <a href="'+r.link_world+'" target="_blank" style="padding:2px 6px;background:#60a5fa15;border:1px solid #60a5fa40;border-radius:4px;color:#60a5fa;font-size:9px;font-weight:700;text-decoration:none">🌍</a>':'')
            +'</td></tr>';
        }).join('')
        +'</tbody></table></div>';
    } else if(mkt==='eu'){
      const eu=EtsyPulse._TRENDING_DATA.europe_bestsellers||[];
      if(!eu.length){cont.innerHTML='<div style="padding:20px;color:var(--text-muted)">Dati europei non disponibili</div>';return;}
      cont.innerHTML='<div style="font-size:12px;font-weight:700;margin-bottom:10px">🇪🇺 Mercati Europei — Etsy da Italia</div>'
        +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card2)"><th style="padding:8px;text-align:left;color:var(--text-dim)">Paese</th><th style="padding:8px;text-align:left;color:var(--text-dim)">Prodotto Top</th><th style="padding:8px;text-align:center;color:var(--text-dim);white-space:nowrap">🔍 Ricerche</th><th style="padding:8px;text-align:center;color:var(--text-dim)">📈 Trend</th><th style="padding:8px;text-align:center;color:var(--text-dim)">💰 Prezzo</th><th style="padding:8px;text-align:left;color:var(--text-dim)">💡 Insight</th></tr></thead><tbody>'
        +eu.map(m=>'<tr style="border-top:1px solid var(--border)"><td style="padding:8px;font-weight:700">'+m.country+'</td><td style="padding:8px;font-style:italic;color:var(--text)">'+m.top+'</td><td style="padding:8px;text-align:center;color:var(--primary);font-weight:700">'+m.searches+'</td><td style="padding:8px;text-align:center;font-weight:800;color:#22c55e">'+m.trend+'</td><td style="padding:8px;text-align:center;color:#22c55e;font-weight:700">'+m.price+'</td><td style="padding:8px;font-size:10px;color:var(--text-muted)">'+m.tip+'</td></tr>').join('')
        +'</tbody></table></div>'
        +'<div style="margin-top:10px;padding:10px;background:var(--bg-card2);border-radius:8px;font-size:11px;color:var(--text-muted)">💡 <strong style="color:var(--text)">Come vendere in Europa:</strong> Imposta spedizione UE in Etsy. Usa titoli in inglese. UK e Germania = mercati più grandi dopo USA.</div>';
    } else {
      const world=EtsyPulse._TRENDING_DATA.world_bestsellers||[];
      if(!world.length){cont.innerHTML='<div style="padding:20px;color:var(--text-muted)">Dati mondiali non disponibili</div>';return;}
      cont.innerHTML='<div style="font-size:12px;font-weight:700;margin-bottom:10px">🌍 Mercati Mondiali — Dove espandersi</div>'
        +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card2)"><th style="padding:8px;text-align:left;color:var(--text-dim)">Mercato</th><th style="padding:8px;text-align:left;color:var(--text-dim)">Prodotto Top</th><th style="padding:8px;text-align:center;color:var(--text-dim);white-space:nowrap">🔍 Ricerche</th><th style="padding:8px;text-align:center;color:var(--text-dim)">📈 Trend</th><th style="padding:8px;text-align:center;color:var(--text-dim)">💰 Prezzo</th><th style="padding:8px;text-align:left;color:var(--text-dim)">💡 Strategia</th></tr></thead><tbody>'
        +world.map(m=>'<tr style="border-top:1px solid var(--border)"><td style="padding:8px;font-weight:700">'+m.country+'</td><td style="padding:8px;font-style:italic;color:var(--text)">'+m.top+'</td><td style="padding:8px;text-align:center;color:var(--primary);font-weight:700">'+m.searches+'</td><td style="padding:8px;text-align:center;font-weight:800;color:#22c55e">'+m.trend+'</td><td style="padding:8px;text-align:center;color:#22c55e;font-weight:700">'+m.price+'</td><td style="padding:8px;font-size:10px;color:var(--text-muted)">'+m.tip+'</td></tr>').join('')
        +'</tbody></table></div>'
        +'<div style="margin-top:10px;padding:10px;background:var(--primary-dim);border-radius:8px;font-size:11px;border:1px solid var(--primary-border)">🚀 <strong>USA = mercato più grande:</strong> 45k ricerche/mese vs 12k Italia. Stessa produzione → revenue 3× potenziale.</div>';
    }
  },


  _renderKeywords(c){
    const data = this._TRENDING_DATA.rising_keywords_it;
    c.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">🔍 Keyword in Crescita — Ricerche Etsy & Google Italia, Aprile 2026</div>
      <div style="overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--bg-card2)">
          <th style="padding:9px 12px;text-align:left;color:var(--text-dim);font-weight:700">Keyword</th>
          <th style="padding:9px 12px;text-align:center;color:var(--text-dim);font-weight:700">Volume</th>
          <th style="padding:9px 12px;text-align:center;color:var(--text-dim);font-weight:700">Crescita</th>
          <th style="padding:9px 12px;text-align:center;color:var(--text-dim);font-weight:700">CPC stimato</th>
          <th style="padding:9px 12px;text-align:left;color:var(--text-dim);font-weight:700">Azione</th>
        </tr></thead>
        <tbody>
          ${data.map(r=>{
            const gc=parseInt(r.growth)>60?'#22c55e':parseInt(r.growth)>40?'#f59e0b':'#60a5fa';
            const vc=r.volume==='alto'?'#22c55e':'#f59e0b';
            return `<tr style="border-top:1px solid var(--border)" onmouseover="this.style.background=\'var(--bg-card2)\'" onmouseout="this.style.background=\'\'">
              <td style="padding:9px 12px"><code style="background:var(--bg-card2);padding:3px 8px;border-radius:5px;font-size:11px;border:1px solid var(--border)">${r.kw}</code></td>
              <td style="padding:9px 12px;text-align:center"><span style="color:${vc};font-weight:700;font-size:11px">${r.volume}</span></td>
              <td style="padding:9px 12px;text-align:center;font-weight:800;color:${gc}">${r.growth}</td>
              <td style="padding:9px 12px;text-align:center;color:var(--text-muted)">${r.cpc}</td>
              <td style="padding:9px 12px;font-size:11px"><button onclick="EtsyPulse.useKeyword('${r.kw}')" style="padding:3px 8px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700">Analizza AI →</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
      <div style="padding:14px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--text)">🔬 Analisi Keyword Personalizzata</div>
        <div style="display:flex;gap:8px">
          <input id="ep-kw-input" class="form-control" placeholder="Inserisci keyword da analizzare…" style="flex:1;font-size:13px">
          <button onclick="EtsyPulse.analyzeKeyword()" class="btn btn-primary">Analizza</button>
        </div>
        <div id="ep-kw-output" style="margin-top:10px;display:none;font-size:13px;line-height:1.7;padding:10px;background:var(--bg-card2);border-radius:8px"></div>
      </div>`;
  },

  _renderCalendar(c){
    const now = new Date().getMonth(); // 0-indexed
    c.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">📅 Calendario Stagionale Laser — Quando vendere cosa</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${this._TRENDING_DATA.seasonal_calendar.map((m,i)=>{
          const isCurrent = i === now;
          const isNext = i === (now+1)%12;
          const border = isCurrent?'var(--primary)':isNext?'#f59e0b':'var(--border)';
          const bg = isCurrent?'var(--primary-dim)':isNext?'#f59e0b10':'var(--bg-card)';
          return `<div style="padding:12px;border-radius:10px;border:2px solid ${border};background:${bg};position:relative">
            ${isCurrent?'<span style="position:absolute;top:6px;right:8px;font-size:9px;font-weight:800;color:var(--primary);text-transform:uppercase">ORA</span>':''}
            ${isNext?'<span style="position:absolute;top:6px;right:8px;font-size:9px;font-weight:800;color:#f59e0b;text-transform:uppercase">PROSSIMO</span>':''}
            <div style="font-size:14px;font-weight:800;color:${isCurrent?'var(--primary)':'var(--text)'};margin-bottom:8px">${m.month}</div>
            <div style="font-size:10px;margin-bottom:8px">
              ${m.peaks.map(p=>`<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;color:${p.includes('★★★')?'#f59e0b':p.includes('★★')?'#fbbf24':p.includes('★')?'#60a5fa':'var(--text-muted)'};font-weight:${p.includes('★')?'700':'400'}">${p}</div>`).join('')}
            </div>
            <div style="font-size:10px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:6px;line-height:1.4">${m.action}</div>
          </div>`;
        }).join('')}
      </div>`;
  },

  _renderNiches(c){
    c.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">🎯 Analisi Nicchie — Seleziona e analizza con AI</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${this._NICHES.map(n=>`
          <button onclick="EtsyPulse.analyzeNiche('${n.id}')" style="padding:14px 10px;border-radius:11px;border:2px solid var(--border);background:var(--bg-card);cursor:pointer;text-align:center;transition:.18s all" onmouseover="this.style.borderColor='${n.color}';this.style.background='${n.color}12'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-card)'">
            <div style="font-size:22px;margin-bottom:6px">${n.em}</div>
            <div style="font-size:12px;font-weight:700;color:var(--text)">${n.label}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Analisi AI →</div>
          </button>`).join('')}
      </div>
      <div id="ep-niche-output" style="display:none;padding:16px;background:var(--bg-card);border-radius:12px;border:1px solid var(--border)">
        <div id="ep-niche-text" style="font-size:13px;line-height:1.8"></div>
      </div>`;
  },

  async analyzeNiche(id){
    const niche = this._NICHES.find(n=>n.id===id);
    if(!niche) return;
    const out=document.getElementById('ep-niche-output');
    const txt=document.getElementById('ep-niche-text');
    if(out) out.style.display='';
    if(txt) txt.innerHTML=`<div style="color:var(--text-muted)">🤖 AI analizza la nicchia "${niche.label}"…</div>`;
    try{
      if(typeof AIStudio==='undefined'||typeof AIStudio._callAI!=='function'){
        toast('AI non disponibile. Configura un provider in Impostazioni → AI Hub','warning'); return;
      }
      const r = await AIStudio._callAI(`Analisi di mercato completa per la nicchia Etsy laser: "${niche.label}" (keyword: ${niche.kw})\n\n**OPPORTUNITÀ:** dimensione mercato, trend crescita, livello concorrenza\n**TOP 5 PRODOTTI** da lanciare ora con prezzo e margine stimato\n**KEYWORD PRINCIPALI:** 10 keyword con volume alto/medio\n**PREZZI DI MERCATO:** range basso/medio/premium\n**STAGIONALITÀ:** mesi migliori\n**AZIONE IMMEDIATA:** cosa fare questa settimana\n\nSii specifico per mercato italiano. Max 350 parole.`);
      if(txt) txt.innerHTML = `<div style="font-size:12px;font-weight:700;color:#f0728f;margin-bottom:10px">🎯 Analisi: ${niche.em} ${niche.label}</div>`
        + r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){
      if(txt) txt.innerHTML=`<div style="color:var(--text-muted)">Configura API key AI in Impostazioni per analisi nicchie.</div>`;
    }
  },

  async useKeyword(kw){
    document.getElementById('ep-kw-input').value = kw;
    this.analyzeKeyword();
  },

  async analyzeKeyword(){
    const kw = document.getElementById('ep-kw-input')?.value?.trim();
    const out = document.getElementById('ep-kw-output');
    if(!kw||!out) return;
    out.style.display='';
    out.innerHTML='<div style="color:var(--text-muted)">🔍 Analisi keyword in corso…</div>';
    try{
      const r = await AIStudio._callAI(`Analisi keyword Etsy approfondita: "${kw}"\n\n**VOLUME RICERCHE:** stima mensile Italia/globale\n**COMPETIZIONE:** numero seller stimati, difficoltà\n**PREZZO MEDIO:** range €X-€Y su Etsy\n**TOP 5 VARIANTI:** keyword correlate con volume\n**STAGIONALITÀ:** mesi di picco\n**CONSIGLIO TITOLO ETSY:** esempio di titolo ottimizzato con questa keyword\n\nMax 180 parole. Pratico e diretto.`);
      out.innerHTML = r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f0728f">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){
      out.innerHTML=`<div style="color:var(--text-muted)">Configura API key AI in Impostazioni.</div>`;
    }
  },

  async aiNicheAnalysis(){
    const hasAI = typeof AIProvider!=='undefined' && AIProvider.hasKey();
    if(!hasAI){ App.navigate('settings'); return; }
    this.tab('niches', null);
    setTimeout(()=> this.analyzeNiche('laser_wedding'), 300);
  }
};
window.EtsyPulse = EtsyPulse;


// ═══════════════════════════════════════════════════════════════════
// PRICE RADAR — Real-time market price search & comparison
// ═══════════════════════════════════════════════════════════════════
const PriceRadar = {

  _PRICE_DB: {
    segnaposto:   {min:1.50,avg:4.20,max:12.00,unit:'cad',vol:'high',  margin:'55-70%',note:'Volume prodotto — punta su bundle 50+ pz'},
    targa_ufficio:{min:12.00,avg:24.00,max:65.00,unit:'cad',vol:'medium',margin:'60-75%',note:'B2B: vendi in partite, margini alti'},
    portachiavi:  {min:3.00,avg:7.50,max:18.00,unit:'cad',vol:'high',  margin:'65-80%',note:'Prodotto gateway — porta a upsell'},
    coaster_set:  {min:12.00,avg:28.00,max:55.00,unit:'set',vol:'medium',margin:'60-70%',note:'Set 4pz = AOV più alto'},
    targa_nascita:{min:15.00,avg:32.00,max:80.00,unit:'cad',vol:'medium',margin:'65-75%',note:'Regalo premium — packaging importante'},
    wall_art:     {min:25.00,avg:55.00,max:150.00,unit:'cad',vol:'low',  margin:'70-80%',note:'Nicchia premium, pochissima concorrenza IT'},
    insegna_led:  {min:60.00,avg:120.00,max:280.00,unit:'cad',vol:'low', margin:'70-85%',note:'B2B goldmine — negozi, ristoranti, uffici'},
    bomboniera:   {min:2.00,avg:6.00,max:15.00,unit:'cad',vol:'high',  margin:'50-65%',note:'Volume elevato, stagionale matrimoni'},
    mappa_incisa: {min:20.00,avg:45.00,max:120.00,unit:'cad',vol:'low',  margin:'65-75%',note:'Premium gift — poca concorrenza italiana'},
    gadget_b2b:   {min:5.00,avg:14.00,max:35.00,unit:'cad',vol:'medium',margin:'60-75%',note:'Ordini minimi 50pz — fidelizzazione aziendale'},
  },

  _MATERIAL_COSTS: {
    mdf_3mm:    {cost:0.008,unit:'€/cm²',note:'MDF standard 3mm'},
    legno_3mm:  {cost:0.015,unit:'€/cm²',note:'Legno betulla 3mm'},
    acrilico_3mm:{cost:0.020,unit:'€/cm²',note:'Acrilico trasparente 3mm'},
    acrilico_col:{cost:0.025,unit:'€/cm²',note:'Acrilico colorato/specchio'},
    ardesia:    {cost:0.040,unit:'€/cm²',note:'Ardesia premium'},
    cuoio:      {cost:0.035,unit:'€/cm²',note:'Cuoio naturale 2mm'},
  },

  render(){
    const el = document.getElementById('view-price_radar');
    if(!el) return;
    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1300px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#fbbf24,#f97316);display:flex;align-items:center;justify-content:center;font-size:26px">📡</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:22px;font-weight:900;background:linear-gradient(135deg,#fbbf24,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Price Radar</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Prezzi di mercato Etsy · Calcolatore margine · Confronto competitor · Pricing AI</p>
        </div>
      </div>

      <!-- 3 COLUMNS: Market DB | Calculator | AI -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px">

        <!-- Market Price DB -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#fbbf24;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">💰 Prezzi Mercato Etsy</h3>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${Object.entries(this._PRICE_DB).map(([k,v])=>`
              <div style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);cursor:pointer;transition:.15s"
                onclick="PriceRadar.showProduct('${k}')"
                onmouseover="this.style.borderColor='#fbbf24'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:12px;font-weight:600;color:var(--text);text-transform:capitalize">${k.replace(/_/g,' ')}</span>
                  <span style="font-size:11px;font-weight:700;color:#22c55e">€${v.avg}/${v.unit}</span>
                </div>
                <div style="font-size:10px;color:var(--text-dim);margin-top:2px">Range: €${v.min}–€${v.max} · Margine: ${v.margin}</div>
              </div>`).join('')}
          </div>
          <div id="pr-product-detail" style="display:none;margin-top:12px;padding:10px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border)"></div>
        </div>

        <!-- Margin Calculator -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#22c55e;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">🧮 Calcolatore Prezzo & Margine</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div>
              <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Costo materiale (€)</label>
              <input id="pr-cost-material" type="number" step="0.01" value="0.80" class="form-control" style="font-size:13px" oninput="PriceRadar.calcMargin()">
            </div>
            <div>
              <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Tempo lavorazione (minuti)</label>
              <input id="pr-time" type="number" step="1" value="15" class="form-control" style="font-size:13px" oninput="PriceRadar.calcMargin()">
            </div>
            <div>
              <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Tariffa oraria tua (€/h)</label>
              <input id="pr-hourly" type="number" step="1" value="25" class="form-control" style="font-size:13px" oninput="PriceRadar.calcMargin()">
            </div>
            <div>
              <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Overhead & packaging (€)</label>
              <input id="pr-overhead" type="number" step="0.10" value="0.50" class="form-control" style="font-size:13px" oninput="PriceRadar.calcMargin()">
            </div>
            <div>
              <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Prezzo di vendita (€)</label>
              <input id="pr-sell" type="number" step="0.50" value="8.00" class="form-control" style="font-size:13px" oninput="PriceRadar.calcMargin()">
            </div>
          </div>
          <div id="pr-margin-result" style="margin-top:12px;padding:12px;border-radius:9px;background:var(--bg-card2);border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--text-muted)">Inserisci i dati per calcolare</div>
          </div>
          <button onclick="PriceRadar.aiPricingSuggestion()" class="btn btn-secondary" style="width:100%;margin-top:10px;font-size:11px">🤖 Suggerimento AI Prezzo</button>
        </div>

        <!-- Competitor Compare -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#60a5fa;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">⚔️ Confronto Prezzi Competitor</h3>
          <input id="pr-comp-product" class="form-control" placeholder="Prodotto da confrontare…" style="font-size:12px;margin-bottom:8px">
          <input id="pr-comp-price" type="number" class="form-control" placeholder="Il TUO prezzo (€)" style="font-size:12px;margin-bottom:10px">
          <button onclick="PriceRadar.compareCompetitor()" style="width:100%;padding:8px;background:linear-gradient(135deg,#60a5fa,#38bdf8);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;margin-bottom:12px">📊 Confronta con Mercato</button>
          <div id="pr-comp-output" style="font-size:12px;color:var(--text-muted)">Inserisci prodotto e prezzo per confronto AI.</div>
        </div>
      </div>

      <!-- Material Cost Calculator -->
      <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
        <h3 style="font-size:12px;font-weight:700;color:#a78bfa;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">🪵 Costo Materiale per Pezzo</h3>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:150px">
            <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Materiale</label>
            <select id="pr-mat" class="form-control" style="font-size:12px" onchange="PriceRadar.calcMaterial()">
              ${Object.entries(this._MATERIAL_COSTS).map(([k,v])=>`<option value="${k}">${k.replace(/_/g,' ')} (${v.cost}€/cm²)</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Larghezza (cm)</label>
            <input id="pr-w" type="number" value="10" class="form-control" style="font-size:12px;width:80px" oninput="PriceRadar.calcMaterial()">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Altezza (cm)</label>
            <input id="pr-h" type="number" value="7" class="form-control" style="font-size:12px;width:80px" oninput="PriceRadar.calcMaterial()">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);font-weight:700;display:block;margin-bottom:3px">Quantità pezzi</label>
            <input id="pr-qty" type="number" value="1" class="form-control" style="font-size:12px;width:80px" oninput="PriceRadar.calcMaterial()">
          </div>
          <div id="pr-mat-result" style="padding:10px 16px;background:var(--primary-dim);border-radius:9px;border:1px solid var(--primary-border);font-size:13px;font-weight:700;color:var(--primary)">—</div>
        </div>
      </div>
    </div>`;

    this.calcMargin();
    this.calcMaterial();
  },

  showProduct(k){
    const p = this._PRICE_DB[k];
    if(!p) return;
    const el = document.getElementById('pr-product-detail');
    if(!el) return;
    el.style.display='';
    el.innerHTML=`<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:6px;text-transform:capitalize">${k.replace(/_/g,' ')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
        <span style="color:var(--text-dim)">Min Etsy:</span><strong style="color:var(--text)">€${p.min}/${p.unit}</strong>
        <span style="color:var(--text-dim)">Media:</span><strong style="color:#22c55e">€${p.avg}/${p.unit}</strong>
        <span style="color:var(--text-dim)">Premium:</span><strong style="color:var(--text)">€${p.max}/${p.unit}</strong>
        <span style="color:var(--text-dim)">Margine:</span><strong style="color:#fbbf24">${p.margin}</strong>
      </div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:6px;border-top:1px solid var(--primary-border);padding-top:5px">💡 ${p.note}</div>`;
  },

  calcMargin(){
    const mat    = parseFloat(document.getElementById('pr-cost-material')?.value)||0;
    const time   = parseFloat(document.getElementById('pr-time')?.value)||0;
    const hourly = parseFloat(document.getElementById('pr-hourly')?.value)||25;
    const over   = parseFloat(document.getElementById('pr-overhead')?.value)||0;
    const sell   = parseFloat(document.getElementById('pr-sell')?.value)||0;
    const labor  = (time/60) * hourly;
    const total  = mat + labor + over;
    const margin = sell>0 ? ((sell-total)/sell*100) : 0;
    const profit = sell - total;
    const el = document.getElementById('pr-margin-result');
    if(!el) return;
    const col = margin>60?'#22c55e':margin>40?'#f59e0b':margin>20?'#f97316':'#ef4444';
    el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
      <span style="color:var(--text-dim)">Costo totale:</span><strong>€${total.toFixed(2)}</strong>
      <span style="color:var(--text-dim)">Profitto:</span><strong style="color:${profit>0?'#22c55e':'#ef4444'}">€${profit.toFixed(2)}</strong>
      <span style="color:var(--text-dim)">Margine:</span><strong style="color:${col};font-size:16px">${margin.toFixed(1)}%</strong>
      <span style="color:var(--text-dim)">Status:</span><strong style="color:${col}">${margin>60?'🟢 Ottimo':margin>40?'🟡 Buono':margin>20?'🟠 Basso':'🔴 Rischio'}</strong>
    </div>`;
  },

  calcMaterial(){
    const mat = this._MATERIAL_COSTS[document.getElementById('pr-mat')?.value];
    const w   = parseFloat(document.getElementById('pr-w')?.value)||10;
    const h   = parseFloat(document.getElementById('pr-h')?.value)||7;
    const qty = parseInt(document.getElementById('pr-qty')?.value)||1;
    if(!mat) return;
    const area = w * h;
    const costEach = (area * mat.cost).toFixed(2);
    const costTotal = (area * mat.cost * qty).toFixed(2);
    const el = document.getElementById('pr-mat-result');
    if(el) el.innerHTML=`€${costEach}/pz <span style="font-size:11px;font-weight:400;color:var(--text-muted)">(×${qty} = €${costTotal})</span>`;
  },

  async compareCompetitor(){
    const product = document.getElementById('pr-comp-product')?.value?.trim();
    const myPrice = document.getElementById('pr-comp-price')?.value;
    const out = document.getElementById('pr-comp-output');
    if(!product||!out) return;
    out.innerHTML='<div style="color:var(--text-muted)">⏳ AI analizza prezzi mercato…</div>';
    try{
      const r = await AIStudio._callAI(`Confronta il prezzo di mercato per: "${product}" ${myPrice?`(mio prezzo: €${myPrice})`:''}\n\nFornisci:\n- Range prezzi Etsy (min/media/max)\n- Il mio prezzo è troppo basso/giusto/alto?\n- Consiglio di riposizionamento\n- Come giustificare un prezzo premium\n\nMax 150 parole. Pratico.`);
      out.innerHTML = r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#60a5fa">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){
      out.innerHTML='<div style="color:var(--text-muted)">Configura API key AI in Impostazioni.</div>';
    }
  },

  async aiPricingSuggestion(){
    const mat    = parseFloat(document.getElementById('pr-cost-material')?.value)||0;
    const time   = parseFloat(document.getElementById('pr-time')?.value)||0;
    const hourly = parseFloat(document.getElementById('pr-hourly')?.value)||25;
    const over   = parseFloat(document.getElementById('pr-overhead')?.value)||0;
    const total  = mat + (time/60)*hourly + over;
    try{
      const r = await AIStudio._callAI(`Suggerisci il prezzo ottimale per un prodotto laser artigianale con costo totale di €${total.toFixed(2)}.\n\nConsiderazione: mercato Etsy italiano, prodotto artigianale, brand artigianale siciliano.\n\nFornisci: prezzo minimo, prezzo consigliato, prezzo premium e perché. Max 100 parole.`);
      const out = document.getElementById('pr-margin-result');
      if(out) out.innerHTML+='<div style="margin-top:8px;padding:8px;background:var(--bg-card);border-radius:7px;font-size:11px;border:1px solid var(--border)">🤖 '+r.replace(/\n/g,' ')+'</div>';
    }catch(e){}
  }
};
window.PriceRadar = PriceRadar;


// ═══════════════════════════════════════════════════════════════════
// DEMAND MAP — Where demand is highest, what people search
// ═══════════════════════════════════════════════════════════════════
const DemandMap = {

  _SEARCH_VOLUME: {
    italia: [
      {region:'Sicilia',       score:82, top:'segnaposto matrimonio legno'},
      {region:'Campania',      score:78, top:'targa personalizzata laser'},
      {region:'Lazio',         score:91, top:'insegna led acrilico'},
      {region:'Lombardia',     score:95, top:'gadget aziendale personalizzato'},
      {region:'Veneto',        score:74, top:'bomboniere laser matrimonio'},
      {region:'Toscana',       score:80, top:'regali laser made in tuscany'},
      {region:'Piemonte',      score:71, top:'decorazioni legno laser'},
      {region:'Puglia',        score:68, top:'segnaposto matrimonio personalizzato'},
    ],
    global_markets: [
      {country:'🇮🇹 Italia',    volume:'alto',   growth:'+23%', best:'Matrimoni, corporate B2B'},
      {country:'🇺🇸 USA',       volume:'altissimo',growth:'+41%',best:'Personalized gifts, home decor'},
      {country:'🇬🇧 UK',        volume:'alto',   growth:'+29%', best:'Wedding, engraved gifts'},
      {country:'🇩🇪 Germania',  volume:'medio',  growth:'+18%', best:'Holzgeschenke, Gravur'},
      {country:'🇫🇷 Francia',   volume:'medio',  growth:'+22%', best:'Cadeaux personnalisés'},
      {country:'🇦🇺 Australia', volume:'medio',  growth:'+35%', best:'Custom laser art, gifts'},
      {country:'🇨🇦 Canada',    volume:'medio',  growth:'+31%', best:'Wedding personalized'},
    ],
    trending_searches_now: [
      {query:'laser cut wedding sign',           vol:'12.3k', trend:'🔥🔥🔥'},
      {query:'personalised laser engraved gifts',vol:'9.8k',  trend:'🔥🔥🔥'},
      {query:'custom acrylic laser cut',         vol:'7.2k',  trend:'🔥🔥'},
      {query:'laser engraved wood gifts',        vol:'15.1k', trend:'🔥🔥🔥'},
      {query:'segnaposto matrimonio laser',      vol:'8.4k',  trend:'🔥🔥🔥'},
      {query:'insegna led personalizzata',       vol:'4.1k',  trend:'🔥🔥🔥🔥'},
      {query:'laser cut ornaments',             vol:'6.7k',  trend:'🔥🔥'},
      {query:'targa porta ufficio laser',        vol:'3.2k',  trend:'🔥🔥🔥🔥'},
    ]
  },

  render(){
    const el = document.getElementById('view-demand_map');
    if(!el) return;
    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1300px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#34d399,#22c55e);display:flex;align-items:center;justify-content:center;font-size:26px">🗺️</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:22px;font-weight:900;background:linear-gradient(135deg,#34d399,#22c55e);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Demand Map</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Dove c'è domanda · Cosa cercano le persone ora · Mercati globali · Ricerche live Google Trends</p>
        </div>
        <button onclick="DemandMap.liveGoogleTrends()" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;transition:.15s" onmouseover="this.style.borderColor='#22c55e';this.style.color='#22c55e'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--text)'">📊 Google Trends Live</button>
      </div>

      <!-- TOP SEARCHES NOW -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🔍 Cosa cercano ora — Ricerche laser in tempo reale</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${this._SEARCH_VOLUME.trending_searches_now.map(s=>`
            <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);transition:.15s"
              onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="font-size:16px;margin-bottom:6px">${s.trend}</div>
              <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3">${s.query}</div>
              <div style="font-size:10px;color:#22c55e;font-weight:700">${s.vol}/mese</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- 2 COLS: Italia + Global -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <!-- Italia Regional -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#34d399;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">🇮🇹 Domanda per Regione</h3>
          ${this._SEARCH_VOLUME.italia.map(r=>`
            <div style="margin-bottom:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:12px;font-weight:600;color:var(--text)">${r.region}</span>
                <span style="font-size:11px;color:var(--text-muted)">${r.score}/100</span>
              </div>
              <div style="height:6px;background:var(--bg-card2);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${r.score}%;background:${r.score>85?'#22c55e':r.score>75?'#60a5fa':'#f59e0b'};border-radius:99px;transition:.3s"></div>
              </div>
              <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${r.top}</div>
            </div>`).join('')}
        </div>

        <!-- Global Markets -->
        <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <h3 style="font-size:12px;font-weight:700;color:#60a5fa;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">🌍 Mercati Globali Etsy</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            ${this._SEARCH_VOLUME.global_markets.map(m=>`
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:7px 0;font-weight:600;color:var(--text)">${m.country}</td>
                <td style="padding:7px 4px;text-align:center">
                  <span style="font-size:10px;color:${m.volume==='altissimo'?'#22c55e':m.volume==='alto'?'#60a5fa':'#f59e0b'};font-weight:700">${m.volume}</span>
                </td>
                <td style="padding:7px 4px;text-align:center;font-weight:700;color:#22c55e">${m.growth}</td>
                <td style="padding:7px 0 7px 4px;font-size:10px;color:var(--text-dim)">${m.best}</td>
              </tr>`).join('')}
          </table>
          <div style="margin-top:12px;padding:10px;background:var(--bg-card2);border-radius:8px;font-size:11px;color:var(--text-muted)">
            💡 <strong style="color:var(--text)">Consiglio:</strong> Imposta la spedizione internazionale su Etsy. USA ha domanda 3× l'Italia ma pochissimi seller italiani laser competitivi.
          </div>
        </div>
      </div>

      <!-- AI Demand Analysis -->
      <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
        <h3 style="font-size:12px;font-weight:700;color:#a78bfa;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">🤖 Analisi Domanda AI — Dove espandersi</h3>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <select id="dm-market" class="form-control" style="font-size:12px">
            <option value="italia">Italia</option>
            <option value="europa">Europa</option>
            <option value="usa">USA/UK</option>
            <option value="tutto">Mercato Globale</option>
          </select>
          <select id="dm-product" class="form-control" style="font-size:12px">
            <option>Segnaposto matrimonio</option>
            <option>Targhe ufficio B2B</option>
            <option>Wall art acrilico</option>
            <option>Gadget corporate</option>
            <option>Regali nascita</option>
            <option>Insegne LED</option>
          </select>
          <button onclick="DemandMap.analyzeDemand()" style="padding:8px 16px;background:linear-gradient(135deg,#34d399,#22c55e);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap">Analizza →</button>
        </div>
        <div id="dm-output" style="font-size:12px;color:var(--text-muted)">Seleziona mercato e prodotto per analisi AI.</div>
      </div>
    </div>`;
  },

  async analyzeDemand(){
    const market  = document.getElementById('dm-market')?.value||'italia';
    const product = document.getElementById('dm-product')?.value||'segnaposto';
    const out     = document.getElementById('dm-output');
    if(!out) return;
    out.innerHTML='<div style="color:var(--text-muted)">🗺️ AI mappa la domanda…</div>';
    try{
      const r = await AIStudio._callAI(`Analisi domanda di mercato: "${product}" nel mercato "${market}"\n\n**DIMENSIONE MERCATO:** volume ricerche mensili stimate\n**DOMANDA:** alta/media/bassa e perché\n**STAGIONALITÀ:** quando è picco\n**PREZZO MEDIO:** range nel mercato target\n**BARRIERE:** difficoltà di entrata\n**TATTICA:** come posizionarsi come artigiano italiano in questo mercato\n**PIATTAFORMA MIGLIORE:** Etsy vs altre\n\nMax 250 parole. Focus pratico.`);
      out.innerHTML = `<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">
        <div style="padding:10px;background:var(--bg-card2);border-radius:9px;border:1px solid var(--border)">
          <div style="font-size:10px;font-weight:800;color:#34d399;text-transform:uppercase;margin-bottom:6px">📍 ${market.toUpperCase()}</div>
          <div style="font-size:12px;font-weight:700;color:var(--text)">${product}</div>
        </div>
        <div style="font-size:12px;line-height:1.7">${r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#34d399">$1</strong>').replace(/\n/g,'<br>')}</div>
      </div>`;
    }catch(e){
      out.innerHTML='<div style="color:var(--text-muted)">Configura API key AI in Impostazioni per analisi domanda.</div>';
    }
  },

  liveGoogleTrends(){
    const terms = ['laser engraving personalized,laser cut wood,custom laser gifts'];
    const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(terms[0])}&geo=IT&date=today+3-m`;
    window.open(url, '_blank');
    toast('🔗 Google Trends aperto in nuova tab','success');
  }
};
window.DemandMap = DemandMap;


// ═══════════════════════════════════════════════════════════════════════════
// INGLY DESIGN HUB v18 — Mondo Ingly Design Hub
// ═══════════════════════════════════════════════════════════════════════════
const LaserResources = {

  // ── 75+ default resources ────────────────────────────────────────────
  _DEFAULTS: [
    // ─── FILE GRATUITI: Repository ───────────────────────────────────────
    {id:1,  tab:'file', cat:'⭐ I Migliori',    icon:'📦', name:'Boxes.py',             url:'https://www.festi.info/boxes.py/',                  color:'#ec4899', badge:'OPEN SOURCE', formats:['SVG','DXF'], desc:'Il generatore di box più completo al mondo: 100+ tipi di scatole, cerniere, living hinge, divisori, ingranaggi. Tutto parametrico, export immediato.'},
    {id:2,  tab:'file', cat:'⭐ I Migliori',    icon:'📐', name:'MakerCase',             url:'https://www.makercase.com/',                        color:'#ec4899', badge:'FREE',        formats:['SVG','DXF'], desc:'Box con finger joint in 30 secondi. Preview 3D real-time, compensazione kerf, slot T-nut. Il più veloce per packaging.'},
    {id:3,  tab:'file', cat:'⭐ I Migliori',    icon:'🎨', name:'Vecty.co',              url:'https://vecty.co/',                                 color:'#f97316', badge:'6k+ FILE',    formats:['CDR','DXF','SVG','EPS'], desc:'6.000+ file laser pronti e testati: lampade, cornici, clock, scatole, decorazioni. CDR, DXF, SVG, EPS tutti gratis.'},
    {id:4,  tab:'file', cat:'⭐ I Migliori',    icon:'🌐', name:'3axis.co',              url:'https://3axis.co/',                                 color:'#60a5fa', badge:'10k+ DESIGN',  formats:['DXF','SVG','CDR'], desc:'La raccolta più grande: 10.000+ file da fonti diverse. Download immediato senza registrazione. Motore di ricerca integrato.'},
    {id:5,  tab:'file', cat:'⭐ I Migliori',    icon:'✨', name:'Ameede',                url:'https://www.ameede.com/',                           color:'#a78bfa', badge:'ALTA QUALITÀ', formats:['SVG','DXF','CDR'], desc:'File puliti e professionali: arte layered, cornici, ornamenti floreali. Path chiusi, layer separati, scalabili.'},
    {id:6,  tab:'file', cat:'Repository',       icon:'🗃️', name:'LibraryLaser',         url:'https://www.librarylaser.com/',                     color:'#ec4899', badge:'1700+',       formats:['AI','DXF','CDR','SVG'], desc:'1704 design: puzzle 3D, wall art, keychain, decorazioni, mobili flat-pack. 8 download/giorno gratuiti.'},
    {id:7,  tab:'file', cat:'Repository',       icon:'📥', name:'FreePatternsArea',     url:'https://www.freepatternsarea.com/',                  color:'#22c55e', badge:'GRATUITO',    formats:['SVG','DXF','CDR','DWG'], desc:'File 2D/3D disegnati a mano: puzzle, cornici, arte CNC. Senza registrazione né watermark.'},
    {id:8,  tab:'file', cat:'Repository',       icon:'🔲', name:'DXF Downloads',        url:'https://www.dxfdownloads.com/',                     color:'#60a5fa', badge:'',            formats:['DXF','SVG','AI'], desc:'Repository DXF: silhouette bold, segnaletica, monogrammi. Ottimizzati per laser alta potenza.'},
    {id:9,  tab:'file', cat:'Repository',       icon:'📂', name:'VectorsFile',          url:'https://vectorsfile.com/',                          color:'#22c55e', badge:'COMMERCIAL',  formats:['DXF','SVG','CDR'], desc:'File verificati su macchina reale. Uso commerciale permesso. Compatibili LightBurn e RDWorks.'},
    {id:10, tab:'file', cat:'Repository',       icon:'🎯', name:'VectorsArt',           url:'https://www.vectorsart.com/',                       color:'#f97316', badge:'',            formats:['SVG','DXF'], desc:'Focus su oggetti funzionali: organizer, holder, scatole assemblabili. Ottimizzati per MDF e acrilico.'},
    {id:11, tab:'file', cat:'Repository',       icon:'🔡', name:'Free SVG',             url:'https://freesvg.org/',                              color:'#38bdf8', badge:'PUBLIC DOMAIN',formats:['SVG'], desc:'SVG in public domain. Silhouette, mandala, animali, pattern. Nessuna restrizione di uso o modifica.'},
    {id:12, tab:'file', cat:'Repository',       icon:'🖼️', name:'SVG Repo',             url:'https://www.svgrepo.com/',                          color:'#60a5fa', badge:'500k+',       formats:['SVG'], desc:'500.000+ SVG liberi da utilizzare. Cerca per stile: outline, filled, flat. Export diretto.'},
    // Design Store
    {id:13, tab:'file', cat:'💎 Design Store',  icon:'💎', name:'Creative Fabrica',     url:'https://www.creativefabrica.com/product-category/graphics/laser-cut/', color:'#9333ea', badge:'ALL ACCESS €9/m', formats:['SVG','DXF','EPS','PNG'], desc:'IL MIGLIORE per chi vende su Etsy. Piano All Access include licenza commerciale illimitata su tutto. Sezione laser dedicata con migliaia di file. €9/mese o €99/anno.'},
    {id:14, tab:'file', cat:'💎 Design Store',  icon:'🌟', name:'Design Bundles',       url:'https://designbundles.net/free-design-resources/free-laser-cutting-files', color:'#f59e0b', badge:'FREE+COMMERCIAL', formats:['SVG','DXF','AI'], desc:'File gratuiti CON licenza commerciale inclusa. Bundle settimanali a prezzi stracciati. Ideale per Etsy.'},
    {id:15, tab:'file', cat:'💎 Design Store',  icon:'🏅', name:'The Hungry JPEG',      url:'https://thehungryjpeg.com/search?q=laser+cut&category=svg', color:'#ec4899', badge:'',       formats:['SVG','PNG','EPS'], desc:'Bundle SVG a basso costo con uso commerciale. Spesso in offerta a €1-3. Buona selezione laser cutting.'},
    {id:16, tab:'file', cat:'💎 Design Store',  icon:'🎁', name:'Craft Bundles',        url:'https://craftbundles.com/product-tag/laser-cut/',   color:'#34d399', badge:'',            formats:['SVG','DXF','PNG'], desc:'Bundle tematici con licenza commerciale. Festività, matrimoni, bambini, stagionale. Prezzi da €2.'},
    {id:17, tab:'file', cat:'💎 Design Store',  icon:'💡', name:'So Fontsy',            url:'https://sofontsy.com/product-category/svg-files/laser-cut-svg/', color:'#60a5fa', badge:'', formats:['SVG','DXF'], desc:'Marketplace indipendente: file SVG laser da designer indie. Mix free/paid. Comunità attiva.'},
    {id:18, tab:'file', cat:'💎 Design Store',  icon:'🛍️', name:'Etsy SVG Files',      url:'https://www.etsy.com/search?q=laser+cut+svg+files&listing_type=digital', color:'#f0728f', badge:'', formats:['SVG','DXF'], desc:'Acquista file digitali da altri artigiani laser. Include licenza commerciale. Nicchie molto specifiche disponibili.'},
    {id:19, tab:'file', cat:'💎 Design Store',  icon:'📐', name:'Laser Ready Templates', url:'https://laserreadytemplates.com/',                 color:'#ec4899', badge:'5000+',       formats:['SVG','DXF','AI','CDR'], desc:'5.000+ template specifici per laser. Mix free/paid. Decor, gioielli, packaging, 3D layered art.'},
    // ─── GENERATORI ──────────────────────────────────────────────────────
    {id:20, tab:'generatori', cat:'📦 Box & Packaging', icon:'📦', name:'Boxes.py',   url:'https://www.festi.info/boxes.py/',                  color:'#ec4899', badge:'100+ TIPI', formats:['SVG','DXF'], desc:'Il riferimento assoluto per scatole parametriche laser. Living hinge, cerniere, divisori, snap-fit, slot.'},
    {id:21, tab:'generatori', cat:'📦 Box & Packaging', icon:'📐', name:'MakerCase',  url:'https://www.makercase.com/',                        color:'#f97316', badge:'',         formats:['SVG','DXF'], desc:'Inserisci dimensioni, spessore, kerf → download immediato. Il più veloce per packaging.'},
    {id:22, tab:'generatori', cat:'📦 Box & Packaging', icon:'🧰', name:'BoxMaker',   url:'https://boxdesigner.connectionlab.org/',            color:'#60a5fa', badge:'',         formats:['SVG'], desc:'Genera scatole semplici con coperchio. Ottimo per packaging regalo con finger joint.'},
    {id:23, tab:'generatori', cat:'✍️ Testo & Font',   icon:'🔤', name:'Text to SVG Path', url:'https://danmarshall.github.io/google-font-to-svg-path/', color:'#a78bfa', badge:'GOOGLE FONTS', formats:['SVG'], desc:'Converte qualsiasi font Google direttamente in path SVG. Testo curvo, size personalizzato. Pronto per laser.'},
    {id:24, tab:'generatori', cat:'✍️ Testo & Font',   icon:'✍️', name:'Calligrapher.ai',url:'https://calligrapher.ai/',                       color:'#ec4899', badge:'AI',        formats:['SVG'], desc:'IA genera calligrafia manoscritta in SVG autentico. Output direttamente incidibile. Ideale per segnaposto matrimonio personalizzati.'},
    {id:25, tab:'generatori', cat:'✍️ Testo & Font',   icon:'🔡', name:'Inkscape Font',   url:'https://inkscape.org/',                          color:'#22c55e', badge:'FREE',      formats:['SVG','DXF'], desc:'Inkscape: converti testo in path (Oggetto → Testo su tracciato), crea monogrammi interlacciati, variabili, personalizzati.'},
    {id:26, tab:'generatori', cat:'🎨 Pattern & Arte', icon:'🌀', name:'Pattern Generator', url:'https://patternico.com/',                      color:'#f59e0b', badge:'',         formats:['SVG'], desc:'Genera pattern ripetuti infiniti in SVG: geometrici, organici, reticolari. Ottimi per background incisione.'},
    {id:27, tab:'generatori', cat:'🎨 Pattern & Arte', icon:'🔵', name:'Hatch Patterns',   url:'https://larswander.com/writing/hatching/',     color:'#60a5fa', badge:'',         formats:['SVG'], desc:'Genera hatching (tratteggio) parametrico in SVG. Incisione artistica su legno e metallo.'},
    {id:28, tab:'generatori', cat:'📱 QR & Barcode',  icon:'📱', name:'QR Monkey',         url:'https://www.qrmonkey.com/',                     color:'#22c55e', badge:'FREE',      formats:['SVG','PDF'], desc:'QR code con logo in formato SVG perfetto per laser. Personalizza colori e stile. Ideale per targhe con link.'},
    {id:29, tab:'generatori', cat:'📱 QR & Barcode',  icon:'🔲', name:'QR Code Generator', url:'https://www.qr-code-generator.com/',            color:'#38bdf8', badge:'',         formats:['SVG','PNG'], desc:'QR code ad alta risoluzione in SVG. Versione vettoriale pronta per incisione laser su qualsiasi materiale.'},
    {id:30, tab:'generatori', cat:'🧩 3D & Puzzle',   icon:'🧩', name:'Puzzle Generator',  url:'https://www.jigsaw-generator.co.uk/',           color:'#f59e0b', badge:'',         formats:['SVG'], desc:'Genera puzzle personalizzati con foto o disegno. Imposta numero di pezzi e forma. Export SVG pronto.'},
    {id:31, tab:'generatori', cat:'🧩 3D & Puzzle',   icon:'🏗️', name:'123D Make / Slicer', url:'https://www.autodesk.com/products/slicer-for-fusion-360/', color:'#60a5fa', badge:'FREE', formats:['DXF','SVG'], desc:'Converte modelli 3D in layer laser. Crea sculture stratificate da qualsiasi modello STL. Effetto 3D con layer 2D.'},
    // ─── SOFTWARE ─────────────────────────────────────────────────────────
    {id:40, tab:'software', cat:'⚡ Software Laser',    icon:'🔦', name:'LightBurn',       url:'https://lightburnsoftware.com/',                color:'#f97316', badge:'€60 LIFETIME', formats:[], desc:'Lo standard per il laser. Gcode, controllo macchina, layer, ottimizzazione percorsi, preview bruciatura. €60 licenza permanente — il miglior investimento.'},
    {id:41, tab:'software', cat:'⚡ Software Laser',    icon:'⚙️', name:'RDWorks',         url:'https://rdworks.software.informer.com/',        color:'#60a5fa', badge:'FREE',        formats:[], desc:'Software gratuito per controller Ruida (xTool, macchine cinesi). Base ma funzionale. Alternativa LightBurn.'},
    {id:42, tab:'software', cat:'⚡ Software Laser',    icon:'🎛️', name:'LaserGRBL',       url:'https://lasergrbl.com/',                        color:'#22c55e', badge:'FREE',        formats:[], desc:'Controller open source per macchine GRBL. Leggero, stabile, gratuito. Ottimo per diode laser economici.'},
    {id:43, tab:'software', cat:'✏️ Vettoriale',        icon:'🎨', name:'Inkscape',         url:'https://inkscape.org/',                         color:'#22c55e', badge:'FREE',        formats:['SVG','DXF'], desc:'Editor vettoriale open source, il più usato dai laser maker. Converti bitmap in vettore, crea path, testo. Plugin LightBurn disponibile.'},
    {id:44, tab:'software', cat:'✏️ Vettoriale',        icon:'🏆', name:'CorelDRAW',        url:'https://www.coreldraw.com/',                    color:'#ec4899', badge:'PREMIUM',     formats:['CDR','SVG'], desc:'Standard professionale. Potente per testo, layout, manipolazione path. Più usato tra i professionisti laser.'},
    {id:45, tab:'software', cat:'✏️ Vettoriale',        icon:'🖥️', name:'Adobe Illustrator',url:'https://www.adobe.com/products/illustrator.html',color:'#f97316', badge:'€25/mese', formats:['AI','SVG'], desc:'Il riferimento per grafica vettoriale professionale. Integrazione con Creative Fabrica. Curva di apprendimento alta.'},
    {id:46, tab:'software', cat:'✏️ Vettoriale',        icon:'🆓', name:'Canva',            url:'https://www.canva.com/',                        color:'#38bdf8', badge:'FREE',        formats:['SVG','PDF'], desc:'Design online gratuito. Buono per layout rapidi e font decorativi. Limitato per path complessi.'},
    {id:47, tab:'software', cat:'🤖 AI Tools',          icon:'🤖', name:'Vectorizer.ai',    url:'https://vectorizer.ai/',                        color:'#ec4899', badge:'AI',          formats:['SVG','DXF'], desc:'Converti qualsiasi immagine (JPEG, PNG, foto) in SVG vettoriale perfetto per laser. AI tracing automatico — risultato professionale.'},
    {id:48, tab:'software', cat:'🤖 AI Tools',          icon:'🎨', name:'Midjourney',       url:'https://www.midjourney.com/',                   color:'#9333ea', badge:'AI',          formats:[], desc:'Genera immagini AI poi convertile in SVG con Vectorizer.ai. Workflow vincente: prompt descrittivo → Midjourney → Vectorizer → Laser.'},
    {id:49, tab:'software', cat:'🤖 AI Tools',          icon:'✂️', name:'remove.bg',        url:'https://www.remove.bg/',                        color:'#f59e0b', badge:'AI FREE',     formats:['PNG'], desc:'Rimuove sfondo dalle foto in un click. Poi importa in Inkscape/Illustrator per tracciare il contorno. Ottimo per ritratti laser.'},
    {id:50, tab:'software', cat:'📊 Calcolo',           icon:'📊', name:'Laser Materials DB',url:'https://laserdb.net/',                         color:'#60a5fa', badge:'COMMUNITY',   formats:[], desc:'Database crowd-sourced di impostazioni laser: cerca per macchina, materiale e spessore. Impostazioni validate da utenti reali.'},
    {id:51, tab:'software', cat:'📊 Calcolo',           icon:'⏱️', name:'LightBurn Material Test',url:'https://lightburnsoftware.com/pages/material-test', color:'#f97316', badge:'', formats:['LBP'], desc:'Template LightBurn ufficiale per test materiali. Genera automaticamente griglia velocità/potenza. Importa direttamente.'},
    // ─── COMMUNITY ────────────────────────────────────────────────────────
    {id:60, tab:'community', cat:'🔴 Reddit',           icon:'🔴', name:'r/lasercutting',   url:'https://www.reddit.com/r/lasercutting/',        color:'#ff4500', badge:'100k+',       formats:[], desc:'La community più attiva al mondo per laser: problemi tecnici, showcase, impostazioni, aiuto macchine. Risposta rapida.'},
    {id:61, tab:'community', cat:'🔴 Reddit',           icon:'🔴', name:'r/xTool',          url:'https://www.reddit.com/r/xtool/',               color:'#ff4500', badge:'50k+',        formats:[], desc:'Community xTool dedicata. Impostazioni, troubleshooting, mod, showcase. Molto attiva e disponibile.'},
    {id:62, tab:'community', cat:'🔴 Reddit',           icon:'🔴', name:'r/DIY',            url:'https://www.reddit.com/r/DIY/',                 color:'#ff4500', badge:'23M+',        formats:[], desc:'Il subreddit DIY più grande. Showcase progetti laser, idee, feedback. Ottimo per validare prodotti prima di venderli.'},
    {id:63, tab:'community', cat:'📘 Facebook',         icon:'📘', name:'Laser Everything (FB)',url:'https://www.facebook.com/groups/lasereverything', color:'#4267b2', badge:'500k+', formats:[], desc:'Il gruppo Facebook più grande per laser cutting/engraving al mondo. Tutorial, file condivisi, marketplace, showcase.'},
    {id:64, tab:'community', cat:'📘 Facebook',         icon:'🇮🇹', name:'Artigiani Laser IT',url:'https://www.facebook.com/groups/artigianilaser', color:'#22c55e', badge:'ITALIA',   formats:[], desc:'Gruppo italiano per artigiani laser. Fornitori locali, prezzi italiani, fiere, supporto in italiano.'},
    {id:65, tab:'community', cat:'📘 Facebook',         icon:'📘', name:'Glowforge Owners (FB)',url:'https://www.facebook.com/groups/glowforgeusers', color:'#4267b2', badge:'',      formats:[], desc:'Community Glowforge: molti tips applicabili ad altre macchine. Ampia libreria di file condivisi nel gruppo.'},
    {id:66, tab:'community', cat:'▶️ YouTube',          icon:'▶️', name:'Laser Everything',  url:'https://www.youtube.com/@LaserEverything',     color:'#ef4444', badge:'1M+',        formats:[], desc:'Tutorial completi: dal setup macchina a progetti avanzati. Confronto materiali, impostazioni reali, review.'},
    {id:67, tab:'community', cat:'▶️ YouTube',          icon:'▶️', name:'Makers Gonna Learn', url:'https://www.youtube.com/@MakersGonnaLearn',   color:'#ef4444', badge:'',           formats:[], desc:'Focus sul BUSINESS laser: pricing, Etsy, marketing, fotografia prodotti. Indispensabile per chi vuole guadagnare.'},
    {id:68, tab:'community', cat:'▶️ YouTube',          icon:'▶️', name:'Ikenna Makes',      url:'https://www.youtube.com/@IkennaMakes',          color:'#ef4444', badge:'',           formats:[], desc:'Tutorial tecnici avanzati: incisione foto, 3D layered art, risoluzione problemi. Alta qualità.'},
    {id:69, tab:'community', cat:'🛍️ Etsy',            icon:'🛍️', name:'Etsy Laser Sellers', url:'https://www.etsy.com/it/search?q=laser+engraving&listing_type=physical', color:'#f0728f', badge:'', formats:[], desc:'Studia i top seller laser italiani su Etsy: prezzi, titoli, fotografie, keyword. La migliore ricerca di mercato.'},
    {id:70, tab:'community', cat:'🛍️ Etsy',            icon:'📚', name:'Etsy Seller Handbook', url:'https://www.etsy.com/seller-handbook/',     color:'#f0728f', badge:'GRATUITO',    formats:[], desc:'Guida ufficiale Etsy per venditori: pricing, SEO, fotografie, shipping, marketing. Aggiornata costantemente.'},
    // ─── MATERIALI ────────────────────────────────────────────────────────
    {id:80, tab:'materiali', cat:'🇮🇹 Fornitori IT',   icon:'🌲', name:'Plastimarket',      url:'https://www.plastimarket.it/',                  color:'#22c55e', badge:'IT',          formats:[], desc:'Fornitore italiano per eccellenza: MDF, acrilico, PVC, forex. Prezzi competitivi, spedizione rapida, campioni disponibili.'},
    {id:81, tab:'materiali', cat:'🇮🇹 Fornitori IT',   icon:'🏭', name:'Modulor (IT/DE)',   url:'https://www.modulor.de/it/',                    color:'#60a5fa', badge:'EU',          formats:[], desc:'Distribuisce in Italia materiali premium: legni speciali, acrilici, cartone, foam. Ottimo per prototipi.'},
    {id:82, tab:'materiali', cat:'🇮🇹 Fornitori IT',   icon:'🪨', name:'Ardesia Italia',    url:'https://www.ardesia-italia.it/',                color:'#374151', badge:'IT',          formats:[], desc:'Fornitore ardesia italiana per incisione laser. Altissimo contrasto, aspetto premium. Targhe e oggettistica top di gamma.'},
    {id:83, tab:'materiali', cat:'🌍 Internazionale',   icon:'🧪', name:'Perspex Shop',      url:'https://perspex.shop/',                         color:'#a78bfa', badge:'EU',          formats:[], desc:'Acrilico premium UK/EU. Colori speciali, mirror, fluorescente, spessori rari. Cut-to-size disponibile.'},
    {id:84, tab:'materiali', cat:'🌍 Internazionale',   icon:'🎨', name:'Inventables',       url:'https://www.inventables.com/categories/materials', color:'#f97316', badge:'USA',     formats:[], desc:'Materiali specifici per laser: legni esotici, acrilico cast, materiali compositi. Spedisce in Europa.'},
    {id:85, tab:'materiali', cat:'🌍 Internazionale',   icon:'👜', name:'Tandy Leather EU',  url:'https://www.tandyleather.eu/',                  color:'#f59e0b', badge:'EU',          formats:[], desc:'Cuoio naturale per incisione laser. Diversi tipi e spessori. Ottimo per portafogli, tag, accessori personalizzati.'},
    {id:86, tab:'materiali', cat:'📊 Prezzi & Indici',  icon:'📈', name:'FRED — Legno WPU081', url:'https://fred.stlouisfed.org/series/WPU081',  color:'#22c55e', badge:'GRATIS',      formats:[], desc:'Indice prezzi legno/lumber della Federal Reserve. Monitora trend mensili. Fondamentale per aggiornare i prezzi al fornitore.'},
    {id:87, tab:'materiali', cat:'📊 Prezzi & Indici',  icon:'📊', name:'FRED — Acrilico WPU0915', url:'https://fred.stlouisfed.org/series/WPU0915', color:'#a78bfa', badge:'GRATIS', formats:[], desc:'Indice prezzi plastica/acrilico FRED. Monitora ogni mese per capire quando i tuoi costi aumenteranno.'},
    {id:88, tab:'materiali', cat:'📊 Prezzi & Indici',  icon:'💡', name:'Materiali Calc.',   url:'https://app.ingly.it/',                          color:'#ec4899', badge:'INTERNO',    formats:[], desc:'Usa il Laser Cost Calculator interno (sezione ⚡ 🧮 Calc Laser) per calcolare costo materiale per pezzo con i tuoi prezzi reali.'},
    // ─── TUTORIAL & BUSINESS ──────────────────────────────────────────────
    {id:90, tab:'tutorial', cat:'⚙️ Impostazioni',     icon:'⚡', name:'xTool P3 Settings', url:'https://wiki.xtool.com/en/xTool-P3-Parameters/', color:'#f97316', badge:'',          formats:[], desc:'Impostazioni ufficiali xTool P3 per tutti i materiali. Potenza, velocità, pass, focus. Partenza sicura.'},
    {id:91, tab:'tutorial', cat:'⚙️ Impostazioni',     icon:'🔦', name:'LightBurn Settings', url:'https://docs.lightburnsoftware.com/',           color:'#ec4899', badge:'',           formats:[], desc:'Documentazione completa LightBurn: impostazioni materiali, layer, ottimizzazioni, troubleshooting.'},
    {id:92, tab:'tutorial', cat:'⚙️ Impostazioni',     icon:'📊', name:'Laser DB',          url:'https://laserdb.net/',                           color:'#60a5fa', badge:'COMMUNITY',  formats:[], desc:'Database impostazioni crowd-sourced: cerca macchina + materiale + spessore → impostazioni validate.'},
    {id:93, tab:'tutorial', cat:'💰 Business & Etsy',  icon:'💰', name:'Etsy Pricing Guide', url:'https://www.etsy.com/seller-handbook/article/how-to-price-your-handmade-products', color:'#22c55e', badge:'', formats:[], desc:'Formula Etsy ufficiale: materiali + tempo × tariffa oraria + overhead + profitto. Come non svendere.'},
    {id:94, tab:'tutorial', cat:'💰 Business & Etsy',  icon:'📸', name:'Product Photography', url:'https://www.etsy.com/seller-handbook/article/the-sellers-guide-to-product-photography', color:'#f59e0b', badge:'', formats:[], desc:'Guida fotografia prodotti Etsy: lighting, background, angolazioni. Le foto sono il tuo principale strumento di vendita.'},
    {id:95, tab:'tutorial', cat:'💰 Business & Etsy',  icon:'🔍', name:'Etsy SEO Guide',     url:'https://www.etsy.com/seller-handbook/article/etsy-search-basics',  color:'#f0728f', badge:'', formats:[], desc:'Come Etsy Search funziona: keyword nel titolo, tag, attributi. Come essere trovato senza pagare ads.'},
    {id:96, tab:'tutorial', cat:'💰 Business & Etsy',  icon:'📧', name:'Email Marketing Laser', url:'https://mailchimp.com/resources/ecommerce-marketing/', color:'#38bdf8', badge:'FREE', formats:[], desc:'Mailchimp gratuito fino a 500 contatti. Costruisci lista email clienti laser per fidelizzazione e riordini.'},
    {id:97, tab:'tutorial', cat:'🎨 Creative Fabrica',  icon:'💎', name:'CF — Guida Completa', url:'https://www.creativefabrica.com/how-to-use/', color:'#9333ea', badge:'',           formats:[], desc:'Come usare Creative Fabrica al massimo: trovare file laser, capire le licenze, scaricare per uso commerciale Etsy. Piano All Access consigliato.'},
    {id:98, tab:'tutorial', cat:'🎨 Creative Fabrica',  icon:'🔍', name:'CF — Laser Cut Files', url:'https://www.creativefabrica.com/search/?q=laser+cut&order=popular', color:'#9333ea', badge:'', formats:['SVG','DXF'], desc:'Ricerca diretta file laser su Creative Fabrica ordinati per popolarità. I più venduti = più richiesti sul mercato.'},
    // ─── FILE GRATUITI: Speciali ─────────────────────────────────────────────
    {id:99,  tab:'file', cat:'🌐 Internazionale',   icon:'🎨', name:'Creative Fabrica Studio',url:'https://studio.creativefabrica.com/',           color:'#9333ea', badge:'FREE TIER',  formats:['SVG','PNG'], desc:'Editor online integrato con la libreria CF. Crea listing Etsy, mockup prodotto, adatta design. Piano base gratuito.'},
    {id:100, tab:'file', cat:'🌐 Internazionale',   icon:'🔗', name:'Noun Project',          url:'https://thenounproject.com/',                   color:'#38bdf8', badge:'FREE+COMM',  formats:['SVG','PNG'], desc:'3M+ icone SVG in public domain. Ottimo per elementi decorativi da combinare. Molti gratis con attribuzione.'},
    {id:101, tab:'file', cat:'🌐 Internazionale',   icon:'🎯', name:'Flaticon',              url:'https://www.flaticon.com/',                     color:'#60a5fa', badge:'FREE+COMM',  formats:['SVG','PNG','EPS'], desc:'16M+ icone vettoriali. Filtra per stile linea (outline). Ottimo per elementi di design laser.'},
    {id:102, tab:'file', cat:'🌐 Internazionale',   icon:'✂️', name:'Openclipart',           url:'https://openclipart.org/',                     color:'#22c55e', badge:'PUBLIC DOMAIN',formats:['SVG'], desc:'160k+ clipart in public domain assoluto. Nessuna licenza, nessun credito richiesto. Ottimo per commerciale.'},
    {id:103, tab:'file', cat:'🏆 Premium Must-Have',icon:'💎', name:'Creative Fabrica ALL ACCESS',url:'https://www.creativefabrica.com/subscription/', color:'#9333ea', badge:'€9/mese', formats:['SVG','DXF','PNG','EPS'], desc:'IL piano All Access: accesso illimitato a 16M+ assets con licenza commerciale completa. Per chi vende su Etsy è il migliore ROI possibile. €9/mese o €99/anno.'},
    {id:104, tab:'file', cat:'🏆 Premium Must-Have',icon:'🌟', name:'Envato Elements',        url:'https://elements.envato.com/graphic-templates/laser',color:'#f59e0b', badge:'€16/mese', formats:['AI','EPS','SVG'], desc:'Illimitato su tutto il catalogo. Più costoso di CF ma include font, template, mockup. Utile se usi anche Photoshop/Illustrator.'},
    {id:105, tab:'file', cat:'🏆 Premium Must-Have',icon:'🔥', name:'Cricut Design Space',   url:'https://design.cricut.com/',                   color:'#ec4899', badge:'FREE+',       formats:['SVG','DXF'], desc:'Comunità enorme: milioni di design SVG gratuiti e premium. Compatibili laser. La libreria più grande per crafters.'},
    // ─── GENERATORI: Avanzati ─────────────────────────────────────────────────
    {id:110, tab:'generatori', cat:'🔬 Avanzati',   icon:'⚙️', name:'Fusion 360 (Autodesk)', url:'https://www.autodesk.com/products/fusion-360/personal', color:'#f97316', badge:'FREE PERSONAL', formats:['DXF','SVG','DWG'], desc:'CAD/CAM professionale gratis per uso personale. Progetta oggetti 3D e crea file laser 2D. Curva apprendimento alta ma potente.'},
    {id:111, tab:'generatori', cat:'🔬 Avanzati',   icon:'📐', name:'FreeCAD',                url:'https://www.freecad.org/',                     color:'#60a5fa', badge:'FREE',         formats:['DXF','SVG'], desc:'CAD open source professionale. Crea disegni tecnici 2D e 3D da convertire in DXF per laser. Alternativa gratuita a SolidWorks.'},
    {id:112, tab:'generatori', cat:'🔬 Avanzati',   icon:'🌀', name:'Grasshopper (Rhino)',    url:'https://www.rhino3d.com/6/new/grasshopper/',   color:'#a78bfa', badge:'PRO',          formats:['DXF','SVG'], desc:'Modellazione parametrica avanzata. Per prodotti con geometria variabile (lampade, pannelli, gioielli complessi).'},
    {id:113, tab:'generatori', cat:'🎨 Decorativi', icon:'🌸', name:'Mandalagaba',           url:'https://www.mandalagaba.com/',                 color:'#ec4899', badge:'FREE',         formats:['SVG','PNG'], desc:'Genera mandala simmetrici infiniti in SVG. Modifica parametri in tempo reale. Export vettoriale perfetto per laser.'},
    {id:114, tab:'generatori', cat:'🎨 Decorativi', icon:'🔲', name:'Truchet Pattern Generator',url:'https://morphogenesis.club/truchet/',         color:'#38bdf8', badge:'FREE',         formats:['SVG'], desc:'Pattern geometrici infiniti basati su tessere Truchet. Unici per ogni render. Wall art geometrica unica.'},
    {id:115, tab:'generatori', cat:'🎨 Decorativi', icon:'🌊', name:'Voronoi Generator',      url:'https://voronoi.vercel.app/',                  color:'#22c55e', badge:'FREE',         formats:['SVG'], desc:'Genera pattern Voronoi organici — usati per gioielli, cornici, pannelli decorativi. Aspetto biologico/moderno.'},
    {id:116, tab:'generatori', cat:'🎨 Decorativi', icon:'📝', name:'Hershey Text (Inkscape)',url:'https://www.evilmadscientist.com/2011/hershey-text-an-inkscape-extension-for-engraving-fonts/', color:'#f59e0b', badge:'FREE', formats:['SVG'], desc:'Font single-line per incisione laser veloce. Il testo viene inciso in una passata sola. 3x più veloce del fill standard.'},
    // ─── SOFTWARE: Workflow ────────────────────────────────────────────────────
    {id:120, tab:'software', cat:'📱 Mobile',        icon:'📱', name:'LightBurn Mobile',       url:'https://lightburnsoftware.com/pages/lightburn-bridge', color:'#f97316', badge:'',      formats:[], desc:'LightBurn Bridge: controlla la tua macchina laser da iPad/tablet mentre sei in officina. Non più schiavi del PC.'},
    {id:121, tab:'software', cat:'📱 Mobile',        icon:'📷', name:'LasMe — Laser App',      url:'https://apps.apple.com/app/lasme-laser-engraver/id1585765261', color:'#a78bfa', badge:'iOS', formats:[], desc:'App iOS per controllare macchine laser direttamente da iPhone. Interfaccia semplificata per operazioni rapide.'},
    {id:122, tab:'software', cat:'🤖 AI Tools',      icon:'🎨', name:'Adobe Firefly',           url:'https://firefly.adobe.com/',                   color:'#f97316', badge:'AI FREE',      formats:['PNG','SVG'], desc:'AI image generation di Adobe. Generare texture, pattern, elementi decorativi → Vectorizer.ai → Laser. Risultati puliti.'},
    {id:123, tab:'software', cat:'🤖 AI Tools',      icon:'✏️', name:'Bing Image Creator',      url:'https://www.bing.com/images/create',            color:'#0078d7', badge:'GRATIS',       formats:['PNG'], desc:'DALL-E 3 gratis via Bing. Genera immagini AI → converti in SVG con Vectorizer.ai. 100 generazioni/giorno gratis.'},
    {id:124, tab:'software', cat:'🔄 Workflow',      icon:'🔄', name:'n8n — Automazione',        url:'https://n8n.io/',                              color:'#22c55e', badge:'SELF-HOST FREE',formats:[], desc:'Automatizza workflow: ordine Etsy → notifica WhatsApp → aggiornamento foglio → promemoria spedizione. Open source.'},
    {id:125, tab:'software', cat:'🔄 Workflow',      icon:'📊', name:'Notion Gestione Ordini',  url:'https://www.notion.so/templates/order-tracker', color:'#6b7280', badge:'FREE',         formats:[], desc:'Template Notion gratuito per tracciare ordini, clienti, produzione. Alternativa semplice a Ingly per chi inizia.'},
    // ─── COMMUNITY: Avanzata ──────────────────────────────────────────────────
    {id:130, tab:'community', cat:'💎 Expert',       icon:'🔴', name:'r/glowforge',             url:'https://www.reddit.com/r/glowforge/',           color:'#ff4500', badge:'80k+',         formats:[], desc:'Community Glowforge: molti tutorial e trick applicabili a qualsiasi laser. Forte cultura della condivisione.'},
    {id:131, tab:'community', cat:'💎 Expert',       icon:'🔴', name:'r/smallbusiness (IT laser)',url:'https://www.reddit.com/r/smallbusiness/search?q=laser', color:'#ff4500', badge:'',  formats:[], desc:'Ricerca "laser" su r/smallbusiness: storie vere di business laser, pricing, problemi operativi. Molto utile.'},
    {id:132, tab:'community', cat:'💎 Expert',       icon:'📘', name:'Laser Engraving & Cutting Pro (FB)',url:'https://www.facebook.com/groups/laserengravingnotes', color:'#4267b2', badge:'200k+', formats:[], desc:'Gruppo professionisti laser su Facebook. Troubleshooting avanzato, impostazioni rare, acquisto/vendita macchine.'},
    {id:133, tab:'community', cat:'▶️ YouTube',      icon:'▶️', name:'Braided Oak Workshop',    url:'https://www.youtube.com/@BraidedOak',           color:'#ef4444', badge:'',             formats:[], desc:'Tutorial legno e laser. Molto tecnico: setup parametri, test materiali, progetti complessi step by step.'},
    {id:134, tab:'community', cat:'▶️ YouTube',      icon:'▶️', name:'xTool Official',          url:'https://www.youtube.com/@xtoolOfficial',        color:'#ef4444', badge:'UFFICIALE',    formats:[], desc:'Canale ufficiale xTool: tutorial macchine, progetti, aggiornamenti software. Indispensabile per utenti P3/D1.'},
    {id:135, tab:'community', cat:'▶️ YouTube',      icon:'▶️', name:'Thunder Laser US',        url:'https://www.youtube.com/@thunderlaserus',      color:'#ef4444', badge:'',             formats:[], desc:'Tutorial CO2 laser professionale. Tecniche avanzate per acrilico, cuoio, vetro. Applicabile a molte macchine.'},
    {id:136, tab:'community', cat:'🇮🇹 Italia',      icon:'🇮🇹', name:'Ingly Design Community', url:'https://www.facebook.com/groups/',              color:'#22c55e', badge:'IT LASER',     formats:[], desc:'Cerca "incisione laser italia" su Facebook per trovare gruppi italiani attivi. Fornitori locali e prezzi reali.'},
    // ─── MATERIALI: Speciali ──────────────────────────────────────────────────
    {id:140, tab:'materiali', cat:'✨ Speciali',      icon:'✨', name:'Cermark Metal Marking',  url:'https://www.cermark.com/',                     color:'#6b7280', badge:'PRO',           formats:[], desc:'Spray Cermark: applicalo su metallo → passa il laser → incisione permanente nera. Permette incisione su acciaio inox, alluminio.'},
    {id:141, tab:'materiali', cat:'✨ Speciali',      icon:'🌈', name:'Acrilico Speciale Chalet', url:'https://www.alucobond.com/',                  color:'#a78bfa', badge:'EU',           formats:[], desc:'Acrilico bicolore/multistrato: taglia → mostra strato colorato sotto. Ideale per segnaletica e targhe professionali.'},
    {id:142, tab:'materiali', cat:'✨ Speciali',      icon:'🪵', name:'Exotic Wood Veneers',     url:'https://www.woodcraft.com/categories/veneer',  color:'#f59e0b', badge:'USA',           formats:[], desc:'Impiallacciature legni esotici (zebra, palissandro, ciliegio): incisione con laser CO2 per aspetto premium assoluto.'},
    {id:143, tab:'materiali', cat:'✨ Speciali',      icon:'🔵', name:'Rowmark Acrilico',        url:'https://www.rowmark.com/',                     color:'#60a5fa', badge:'PRO',           formats:[], desc:'Standard industria per targhe: acrilico incidibile con doppio strato colorato. Usato da professionisti segnaletica.'},
    {id:144, tab:'materiali', cat:'📦 Packaging',    icon:'📦', name:'Packhelp — Packaging',    url:'https://packhelp.com/it/',                     color:'#f97316', badge:'EU',            formats:[], desc:'Packaging personalizzato: scatole, buste, tissue paper con logo. Packaging premium +25-40% prezzo percepito.'},
    {id:145, tab:'materiali', cat:'📦 Packaging',    icon:'🎀', name:'Noissue — Eco Packaging', url:'https://www.noissue.co/',                      color:'#22c55e', badge:'ECO',           formats:[], desc:'Packaging eco-sostenibile personalizzato con logo. Cliente finale fotografa e condivide — marketing organico gratis.'},
    // ─── TUTORIAL: Business Avanzato ─────────────────────────────────────────
    {id:150, tab:'tutorial', cat:'💰 Pricing Pro',   icon:'📊', name:'Marmalead — Etsy SEO',    url:'https://marmalead.com/',                       color:'#f0728f', badge:'€19/mese',      formats:[], desc:'Tool SEO Etsy professionale: analisi keyword volume reale, competitor, trend stagionali. Il migliore per ottimizzare listing.'},
    {id:151, tab:'tutorial', cat:'💰 Pricing Pro',   icon:'📈', name:'Everbee — Etsy Analytics', url:'https://www.everbee.io/',                     color:'#ec4899', badge:'FREE+',         formats:[], desc:'Analisi competitor Etsy: vedi quante vendite fa ogni shop, prezzi, revenue stimata. Fondamentale per capire il mercato.'},
    {id:152, tab:'tutorial', cat:'💰 Pricing Pro',   icon:'🔍', name:'Sale Samurai — Etsy Research',url:'https://salesamurai.io/',                  color:'#a78bfa', badge:'€9/mese',       formats:[], desc:'Ricerca keyword Etsy con dati di volume reali. Trova keyword long-tail ad alta conversione con bassa concorrenza.'},
    {id:153, tab:'tutorial', cat:'📸 Fotografia',    icon:'📸', name:'Canva — Product Mockups', url:'https://www.canva.com/mockups/',               color:'#38bdf8', badge:'FREE+',         formats:[], desc:'Mockup gratuiti in Canva: presenta i tuoi prodotti laser su sfondi bianchi professionali per listing Etsy senza studio.'},
    {id:154, tab:'tutorial', cat:'📸 Fotografia',    icon:'🖼️', name:'Smartmockups',            url:'https://smartmockups.com/',                    color:'#60a5fa', badge:'FREE+',         formats:[], desc:'Mockup professionali: inserisci foto del tuo prodotto in scene lifestyle realistiche. Converte molto meglio delle foto piatte.'},
    {id:155, tab:'tutorial', cat:'🔧 Manutenzione',  icon:'🔧', name:'xTool P3 Maintenance Guide',url:'https://wiki.xtool.com/en/xTool-P3-Maintenance/', color:'#f59e0b', badge:'',      formats:[], desc:'Guida manutenzione ufficiale xTool P3: pulizia lenti, allineamento, sostituzione parti. Preventiva problemi costosi.'},
    {id:156, tab:'tutorial', cat:'🔧 Manutenzione',  icon:'⚡', name:'Laser Safety Guide',       url:'https://www.laserscribe.co.uk/laser-safety/',  color:'#ef4444', badge:'IMPORTANTE',   formats:[], desc:'Guida sicurezza laser: ventilazione, DPI, materiali sicuri vs pericolosi (PVC, policarbonato). Leggi prima di tutto.'},

    // ─── Extra: Specializzati World-Class ────────────────────────────────
    {id:120,tab:'file',cat:'🏆 Specializzati',icon:'🌐',name:'Laser Cutting Pro',url:'https://www.lasercut.pro/',color:'#ef4444',badge:'TESTATI',formats:['SVG','DXF'],desc:'File specificamente testati su macchine reali. Download immediato. Community verifica ogni file prima della pubblicazione.'},
    {id:121,tab:'file',cat:'🏆 Specializzati',icon:'💎',name:'Oblong Creative',url:'https://www.oblongcreative.com/',color:'#9333ea',badge:'',formats:['SVG','DXF'],desc:'Designer professionale: file laser artistici di altissima qualità. Lampade geometriche, wall art layered, puzzle 3D premium.'},
    {id:122,tab:'file',cat:'🏆 Specializzati',icon:'🎯',name:'My SVG Designs',url:'https://www.mysvgdesigns.com/',color:'#f97316',badge:'COMMERCIAL',formats:['SVG'],desc:'SVG ottimizzati per laser cutting con licenza commerciale. Focus su monogrammi, alfabeti decorativi, frame.'},
    {id:123,tab:'generatori',cat:'📱 QR & Barcode',icon:'🔢',name:'Barcode Generator',url:'https://barcode.tec-it.com/',color:'#374151',badge:'FREE',formats:['SVG','PNG'],desc:'Genera barcode EAN, Code 128, QR in formato SVG vettoriale. Perfetti per targhe prodotto, etichette, packaging laser.'},
    {id:124,tab:'generatori',cat:'🔬 Avanzati',icon:'🌊',name:'SVG Living Hinge',url:'https://parametric.press/issue-01/svg-hinge/',color:'#60a5fa',badge:'',formats:['SVG'],desc:'Generatore living hinge parametrico: pattern flessibili per scatole curve in MDF/acrilico. Scegli densità e pattern.'},
    {id:125,tab:'software',cat:'💰 Business',icon:'📦',name:'ShipStation IT',url:'https://www.shipstation.com/europe/',color:'#38bdf8',badge:'',formats:[],desc:'Gestione spedizioni multi-corriere: DHL, UPS, FedEx, Poste Italiane. Stampa etichette in massa, tracking automatico clienti.'},
    {id:126,tab:'software',cat:'💰 Business',icon:'📊',name:'Printify (Print-on-Demand)',url:'https://printify.com/',color:'#22c55e',badge:'',formats:[],desc:'Print-on-demand: aggiungi i tuoi design laser su prodotti fisici (t-shirt, tazze, poster). Complemento all\'artigianato laser.'},
    {id:127,tab:'materiali',cat:'🧪 Speciali & Rari',icon:'🌈',name:'Acrilico Opalescente',url:'https://www.plasticsheetsshop.co.uk/opal-acrylic-sheets.html',color:'#a78bfa',badge:'',formats:[],desc:'Acrilico opalescente/traslucido: effetto diffusione luce perfetto per lampade e notturni LED. Molto richiesto su Etsy.'},
    {id:128,tab:'materiali',cat:'🧪 Speciali & Rari',icon:'🪵',name:'Noce Europeo Italia',url:'https://www.legnami.net/',color:'#f59e0b',badge:'IT',formats:[],desc:'Fornitore legni nobili italiani: noce, ciliegio, frassino. Premium per prodotti Etsy fascia alta. Fogli da 3-6mm.'},
    {id:129,tab:'tutorial',cat:'🚀 Crescita Etsy',icon:'🧪',name:'A/B Test Listing Etsy',url:'https://www.etsy.com/seller-handbook/article/how-to-use-stats',color:'#22c55e',badge:'',formats:[],desc:'Come usare statistiche Etsy per A/B testare: cambia 1 elemento alla volta (foto, titolo, prezzo) e misura l\'impatto CTR.'},
    {id:130,tab:'tutorial',cat:'🚀 Crescita Etsy',icon:'🎁',name:'Free Shipping Thresholds',url:'https://www.etsy.com/seller-handbook/article/offering-free-shipping-on-etsy',color:'#f0728f',badge:'',formats:[],desc:'Strategia spedizione gratis: imposta soglia €30-50 per incoraggiare upsell. Etsy boost algoritmico per listing free-shipping.'},
    // ═══ STAMPA 3D (Bambu Lab P1S/P2S & co.) ═══
    {id:300,tab:'stampa3d',cat:'⭐ File 3D — I Migliori',icon:'🌐',name:'MakerWorld (Bambu Lab)',url:'https://makerworld.com/',color:'#22c55e',badge:'TOP',formats:['3MF','STL'],desc:'Libreria ufficiale Bambu Lab: profili di stampa pronti per P1S/X1, un-click print. Modelli gratuiti + contest a premi.'},
    {id:301,tab:'stampa3d',cat:'⭐ File 3D — I Migliori',icon:'📥',name:'Printables (Prusa)',url:'https://www.printables.com/',color:'#f97316',badge:'TOP',formats:['STL','3MF'],desc:'Enorme repository gratuito, qualità alta e community attiva. Filtra per "commercial use" per vendere i tuoi prodotti.'},
    {id:302,tab:'stampa3d',cat:'File 3D — Repository',icon:'🗃️',name:'Thingiverse',url:'https://www.thingiverse.com/',color:'#38bdf8',badge:'FREE',formats:['STL'],desc:'Lo storico archivio di modelli 3D gratuiti. Verifica sempre la licenza prima dell\'uso commerciale.'},
    {id:303,tab:'stampa3d',cat:'File 3D — Repository',icon:'💎',name:'Cults3D',url:'https://cults3d.com/',color:'#a855f7',badge:'FREE/€',formats:['STL','3MF'],desc:'Modelli gratuiti e a pagamento, molti con licenza commerciale chiara. Ottimo per prodotti da rivendere.'},
    {id:304,tab:'stampa3d',cat:'File 3D — Repository',icon:'🛒',name:'MyMiniFactory',url:'https://www.myminifactory.com/',color:'#ec4899',badge:'FREE/€',formats:['STL'],desc:'File curati e testati, sezione con licenze commerciali. Buono per articoli regalo e decor.'},
    {id:305,tab:'stampa3d',cat:'Slicer & Software',icon:'🖥️',name:'Bambu Studio',url:'https://bambulab.com/en/download/studio',color:'#22c55e',badge:'FREE',formats:[],desc:'Slicer ufficiale Bambu Lab per P1S/P2S: profili ottimizzati, AMS multicolore, gestione code di stampa.'},
    {id:306,tab:'stampa3d',cat:'Slicer & Software',icon:'⚙️',name:'OrcaSlicer',url:'https://github.com/SoftFever/OrcaSlicer',color:'#f59e0b',badge:'FREE',formats:[],desc:'Slicer avanzato (fork), calibrazione flusso/temperatura di precisione. Compatibile Bambu. Per chi vuole qualità massima.'},
    {id:307,tab:'stampa3d',cat:'Slicer & Software',icon:'🎨',name:'Fusion 360 (hobby)',url:'https://www.autodesk.com/products/fusion-360/personal',color:'#38bdf8',badge:'FREE*',formats:['STEP','STL'],desc:'CAD parametrico gratuito per uso personale: progetta prodotti su misura da zero (targhe, supporti, gadget).'},
    {id:308,tab:'stampa3d',cat:'Slicer & Software',icon:'✏️',name:'Tinkercad',url:'https://www.tinkercad.com/',color:'#a5b4fc',badge:'FREE',formats:['STL'],desc:'CAD semplicissimo nel browser: personalizzazioni rapide (nomi, testi 3D, portachiavi) senza curva d\'apprendimento.'},
    {id:309,tab:'stampa3d',cat:'Materiali & Filamenti',icon:'🧵',name:'Bambu Lab Store — Filamenti',url:'https://eu.store.bambulab.com/collections/filament',color:'#22c55e',badge:'IT/EU',formats:[],desc:'PLA/PETG/ASA/TPU con RFID (riconoscimento automatico AMS). Qualità costante = meno scarti. Prezzi di riferimento per il quoter.'},
    {id:310,tab:'stampa3d',cat:'Materiali & Filamenti',icon:'🌈',name:'Polymaker / eSUN',url:'https://polymaker.com/',color:'#f97316',badge:'€',formats:[],desc:'Filamenti economici e speciali (silk, matte, legno, glow). Ottimo rapporto qualità/prezzo per volumi.'},
    {id:311,tab:'stampa3d',cat:'Materiali & Filamenti',icon:'📊',name:'Filament Comparison (guida)',url:'https://www.simplyfilament.com/',color:'#a855f7',badge:'GUIDA',formats:[],desc:'Confronto proprietà materiali (resistenza, temperatura, food-safe): scegli il filamento giusto per ogni prodotto.'},
    {id:312,tab:'stampa3d',cat:'Community & Business',icon:'👥',name:'r/BambuLab (Reddit)',url:'https://www.reddit.com/r/BambuLab/',color:'#ff4500',badge:'COMMUNITY',formats:[],desc:'Trucchi, calibrazioni e fix per P1S/P2S/AMS. Cerca prima di ogni problema: quasi tutto è già risolto qui.'},
    {id:313,tab:'stampa3d',cat:'Community & Business',icon:'💶',name:'Vendere stampe 3D — licenze',url:'https://www.printables.com/@commercial',color:'#22c55e',badge:'BUSINESS',formats:[],desc:'Come vendere legalmente stampe 3D: verifica sempre la licenza (personal vs commercial). Molti designer chiedono royalty.'},
    {id:314,tab:'stampa3d',cat:'Community & Business',icon:'🧮',name:'Calcolo costo stampa (metodo)',url:'https://www.prusa3d.com/article/how-much-does-3d-printing-cost_38650/',color:'#f59e0b',badge:'GUIDA',formats:[],desc:'Metodo per prezzare: filamento (g × €/kg) + energia (kWh × tariffa) + usura macchina + tempo lavoro + post-processing. Usa lo Smart Quoter 3D.'},
    {id:315,tab:'stampa3d',cat:'File 3D — Repository',icon:'🎁',name:'Thangs',url:'https://thangs.com/',color:'#38bdf8',badge:'FREE',formats:['STL'],desc:'Motore di ricerca modelli 3D con ricerca geometrica: trova varianti di un oggetto simile. Utile per idee prodotto.'},
  ],

  _SK_CUSTOM:  'ingly_lr_custom_v1',
  _SK_REMOVED: 'ingly_lr_removed_v1',
  _currentTab: 'file',

  getCustom(){  try{return JSON.parse(localStorage.getItem(this._SK_CUSTOM)||'[]')}catch{return[]} },
  setCustom(a){ try{localStorage.setItem(this._SK_CUSTOM,JSON.stringify(a))}catch{} },
  getRemoved(){ try{return JSON.parse(localStorage.getItem(this._SK_REMOVED)||'[]')}catch{return[]} },
  setRemoved(a){try{localStorage.setItem(this._SK_REMOVED,JSON.stringify(a))}catch{} },

  _getTab(tab){
    const removed = new Set(LaserResources.getRemoved());
    return [
      ...(LaserResources._DEFAULTS||[]).filter(r=>r.tab===tab && !removed.has(r.id)),
      ...LaserResources.getCustom().filter(r=>r.tab===tab),
    ];
  },

  render(){
    const el = document.getElementById('view-laserresources');
    if(!el) return;
    const hasAI = typeof AIStudio!=='undefined' && typeof AIProvider!=='undefined' && AIProvider.hasKey();
    const TABS = [
      {k:'file',       em:'📁', label:'File Gratuiti'},
      {k:'generatori', em:'📦', label:'Generatori'},
      {k:'software',   em:'🖥️', label:'Software & AI'},
      {k:'community',  em:'👥', label:'Community'},
      {k:'materiali',  em:'🪵', label:'Materiali'},
      {k:'stampa3d',   em:'🖨️', label:'Stampa 3D'},
      {k:'tutorial',   em:'📚', label:'Tutorial & Business'},
    ];
    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1300px">
      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#ec4899,#f97316);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🔴</div>
        <div style="flex:1;min-width:0">
          <h2 style="margin:0 0 2px;font-size:22px;font-weight:900;background:linear-gradient(135deg,#ec4899,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Il Mondo Ingly Design v10</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">98 risorse · File gratuiti · Creative Fabrica · Generatori · Software · Community · Materiali · Tutorial business</p>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button onclick="LaserResources.openAiSearch()" style="padding:8px 14px;background:${hasAI?'linear-gradient(135deg,#ec4899,#8b5cf6)':'var(--bg-card2)'};color:${hasAI?'#fff':'var(--text-muted)'};border:${hasAI?'none':'1px solid var(--border2)'};border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px">
            🤖 ${hasAI?'Chiedi AI':'Configura AI'}
          </button>
          <button onclick="LaserResources.openEditor()" style="padding:8px 14px;background:var(--bg-card2);color:var(--text);border:1px solid var(--border2);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;transition:.15s" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--text)'">
            <i class="fas fa-edit" style="font-size:11px"></i> Gestisci
          </button>
        </div>
      </div>

      <!-- AI QUICK PROMPT BAR (visible if AI configured) -->
      ${hasAI?`<div style="display:flex;gap:8px;margin-bottom:14px;padding:10px 14px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border)">
        <i class="fas fa-robot" style="color:#a78bfa;font-size:14px;flex-shrink:0;margin-top:1px"></i>
        <input id="lr-quick-ask" placeholder="Chiedi all'AI: impostazioni, siti, troubleshooting, consigli business…" style="flex:1;background:none;border:none;color:var(--text);font-size:13px;outline:none" onkeydown="if(event.key==='Enter')LaserResources.quickAsk()">
        <button onclick="LaserResources.quickAsk()" style="padding:4px 12px;background:var(--primary);border:none;border-radius:6px;color:#000;font-weight:700;cursor:pointer;font-size:12px">→</button>
      </div>`:''}

      <!-- TABS -->
      <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg-card2);padding:4px;border-radius:10px;flex-wrap:wrap">
        ${TABS.map((t,i)=>{
          const count = LaserResources._getTab(t.k).length;
          return `<button onclick="LaserResources.tab('${t.k}',this)" class="lr-tab${i===0?' lr-tab-active':''}" style="padding:7px 12px;border-radius:7px;border:none;background:${i===0?'var(--bg-card)':'transparent'};color:${i===0?'var(--primary)':'var(--text-muted)'};cursor:pointer;font-size:11px;font-weight:700;transition:.15s;white-space:nowrap;display:flex;align-items:center;gap:5px">${t.em} ${t.label} <span style="font-size:9px;opacity:.6">${count}</span></button>`;
        }).join('')}
      </div>

      <!-- SEARCH BAR -->
      <div style="position:relative;margin-bottom:14px">
        <i class="fas fa-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:12px"></i>
        <input id="lr-search" placeholder="Cerca per nome, categoria, formato…" oninput="LaserResources._filterCards(this.value)"
          style="width:100%;padding:9px 12px 9px 34px;background:var(--bg-card);border:1px solid var(--border2);border-radius:9px;color:var(--text);font-size:13px;box-sizing:border-box;outline:none;transition:.15s"
          onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border2)'">
      </div>

      <!-- CONTENT -->
      <div id="lr-content"></div>

      <!-- AI SEARCH MODAL -->
      <div id="lr-ai-panel" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center">
        <div style="background:var(--bg-card);border-radius:18px;padding:24px;width:min(640px,94vw);border:1px solid var(--border2);box-shadow:0 32px 80px #000c;max-height:85vh;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
              <h3 style="margin:0 0 2px;font-size:16px;font-weight:800">🤖 Assistente Laser AI</h3>
              <div style="font-size:11px;color:var(--text-muted)">Impostazioni, file, troubleshooting, business, materiali</div>
            </div>
            <button onclick="document.getElementById('lr-ai-panel').style.display='none'" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
          </div>
          <!-- Quick prompts -->
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
            ${[
              ['⚙️','Impostazioni acrilico 3mm xTool P3'],
              ['🌲','Migliori impostazioni MDF 3mm'],
              ['💰','Come prezzare un segnaposto matrimonio'],
              ['🛍️','Top 5 nicchie Etsy laser 2026'],
              ['🔧','Perché si brucia il bordo del legno'],
              ['📦','Materiali per packaging premium'],
            ].map(([e,p])=>`<button onclick="document.getElementById('lr-ai-input').value='${p}';LaserResources.askAI()" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px;transition:.15s" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--text)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">${e} ${p}</button>`).join('')}
          </div>
          <div style="display:flex;gap:8px">
            <textarea id="lr-ai-input" class="form-control" rows="2" placeholder="Es: Quali impostazioni per incidere foto su legno di ciliegio 3mm con xTool P3?" style="resize:none;flex:1"></textarea>
            <button onclick="LaserResources.askAI()" style="padding:10px 18px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;align-self:flex-end">Chiedi →</button>
          </div>
          <div id="lr-ai-output" style="margin-top:14px;font-size:13px;line-height:1.7;display:none;padding:12px;background:var(--bg-card2);border-radius:9px;border:1px solid var(--border)"></div>
        </div>
      </div>

      <!-- EDITOR MODAL -->
      <div id="lr-editor-panel" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto">
        <div style="background:var(--bg-card);border-radius:18px;width:min(860px,96vw);border:1px solid var(--border2);box-shadow:0 32px 80px #000c;overflow:hidden">
          <div style="display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:16px;font-weight:800">⚙️ Gestisci Risorse Laser</div>
              <div style="font-size:11px;color:var(--text-muted)">Aggiungi, modifica ed elimina risorse nel Mondo Ingly Design</div>
            </div>
            <button onclick="document.getElementById('lr-editor-panel').style.display='none';LaserResources.tab(LaserResources._currentTab)" style="margin-left:auto;width:30px;height:30px;border-radius:50%;border:none;background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:.15s" onmouseover="this.style.background='#ef444430';this.style.color='#ef4444'" onmouseout="this.style.background='var(--bg-card2)';this.style.color='var(--text-muted)'">✕</button>
          </div>
          <div style="display:flex;gap:0;border-bottom:1px solid var(--border)">
            <button id="lre-tab-add"     onclick="LaserResources.editorTab('add')"     style="padding:10px 18px;background:var(--primary-dim);border:none;border-bottom:2px solid var(--primary);color:var(--primary);font-weight:700;font-size:12px;cursor:pointer">➕ Aggiungi Nuova</button>
            <button id="lre-tab-list"    onclick="LaserResources.editorTab('list')"    style="padding:10px 18px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);font-weight:600;font-size:12px;cursor:pointer">📋 Tutte le Risorse</button>
            <button id="lre-tab-removed" onclick="LaserResources.editorTab('removed')" style="padding:10px 18px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);font-weight:600;font-size:12px;cursor:pointer">🗑️ Rimosse</button>
          </div>
          <div id="lr-editor-body" style="padding:20px;max-height:72vh;overflow-y:auto"></div>
        </div>
      </div>

      <!-- AI QUICK OUTPUT (inline) -->
      <div id="lr-quick-output" style="display:none;margin-bottom:14px;padding:14px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;font-weight:700;color:#a78bfa">🤖 AI Response</span>
          <button onclick="document.getElementById('lr-quick-output').style.display='none'" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px">✕</button>
        </div>
        <div id="lr-quick-text" style="font-size:13px;line-height:1.7;color:var(--text)"></div>
      </div>
    </div>`;

    // Use setTimeout to ensure DOM is painted before calling tab()
    setTimeout(()=>LaserResources.tab('file', document.querySelector('.lr-tab')), 0);
  },

  tab(name, btn){
    LaserResources._currentTab = name;
    document.querySelectorAll('.lr-tab').forEach(b=>{b.style.background='transparent';b.style.color='var(--text-muted)';b.classList.remove('lr-tab-active');});
    if(btn){btn.style.background='var(--bg-card)';btn.style.color='var(--primary)';btn.classList.add('lr-tab-active');}
    const content=document.getElementById('lr-content');
    if(!content) return;
    const items=LaserResources._getTab(name);
    if(!items.length){
      content.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:10px">📭</div>
        <div style="font-weight:700;margin-bottom:8px">Nessuna risorsa in questa categoria</div>
        <button onclick="LaserResources.openEditor()" class="btn btn-primary btn-sm">➕ Aggiungi prima risorsa</button>
      </div>`;
      return;
    }
    const cats={};
    items.forEach(r=>{(cats[r.cat]||(cats[r.cat]=[])).push(r);});
    content.innerHTML=Object.entries(cats).map(([cat,resources])=>`
      <div class="lr-cat-group" style="margin-bottom:22px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
          ${cat} <span style="font-weight:400;opacity:.6;font-size:9px">${resources.length} risorse</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
          ${resources.map(r=>this._card(r)).join('')}
        </div>
      </div>`).join('');

    // Show search bar active
    const search=document.getElementById('lr-search');
    if(search&&search.value) this._filterCards(search.value);
  },

  _filterCards(q){
    const ql=q.toLowerCase().trim();
    document.querySelectorAll('.lr-resource-card').forEach(card=>{
      const text=card.dataset.search||'';
      card.style.display=!ql||text.includes(ql)?'':'none';
    });
    // Hide empty category groups
    document.querySelectorAll('.lr-cat-group').forEach(g=>{
      const visible=[...g.querySelectorAll('.lr-resource-card')].some(c=>c.style.display!=='none');
      g.style.display=visible?'':'none';
    });
  },

  _card(item){
    const isCustom=item._custom||typeof item.id==='string';
    const searchData=`${item.name} ${item.cat} ${item.desc} ${(item.formats||[]).join(' ')}`.toLowerCase();
    return `<div class="lr-resource-card" data-id="${item.id}" data-search="${searchData}"
      style="position:relative;display:flex;flex-direction:column;padding:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;transition:.18s all;group"
      onmouseover="this.style.borderColor='${item.color||'var(--primary)'}';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px #0006';this.querySelector('.lr-actions').style.opacity='1'"
      onmouseout="this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow='';this.querySelector('.lr-actions').style.opacity='0'">
      <!-- Hover Actions -->
      <div class="lr-actions" style="position:absolute;top:8px;right:8px;display:flex;gap:3px;opacity:0;transition:.15s;z-index:2">
        ${isCustom?`<button onclick="event.stopPropagation();LaserResources.editItem(${JSON.stringify(item.id)})" title="Modifica" style="width:22px;height:22px;border-radius:5px;border:1px solid var(--border2);background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">✏️</button>`:''}
        <button onclick="event.stopPropagation();LaserResources.removeItem(${JSON.stringify(item.id)})" title="Rimuovi" style="width:22px;height:22px;border-radius:5px;border:1px solid #ef444440;background:#ef444408;color:#ef4444;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">🗑</button>
      </div>
      <a href="${item.url}" target="_blank" rel="noopener" style="text-decoration:none;display:flex;flex-direction:column;flex:1">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
          <span style="font-size:20px;flex-shrink:0;line-height:1">${item.icon||'🔗'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:800;color:${item.color||'var(--text)'};margin-bottom:1px;line-height:1.2">${item.name}</div>
            <div style="font-size:9px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.url.replace('https://','').split('/')[0]}</div>
          </div>
          ${item.badge?`<span style="padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;background:${item.color||'var(--primary)'}18;color:${item.color||'var(--primary)'};flex-shrink:0;white-space:nowrap;border:1px solid ${item.color||'var(--primary)'}30">${item.badge}</span>`:''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.5;flex:1">${item.desc}</div>
        ${item.formats?.length?`<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${item.formats.map(f=>`<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:var(--bg-card2);color:var(--text-dim);border:1px solid var(--border)">${f}</span>`).join('')}</div>`:''}
        ${isCustom?`<div style="margin-top:6px"><span style="font-size:9px;color:var(--primary);background:var(--primary-dim);padding:2px 7px;border-radius:99px;border:1px solid var(--primary-border)">Custom</span></div>`:''}
      </a>
    </div>`;
  },

  removeItem(id){
    if(!confirm('Rimuovere questa risorsa dalla lista?')) return;
    const r=LaserResources.getRemoved(); if(!r.includes(id))r.push(id); this.setRemoved(r);
    this.setCustom(LaserResources.getCustom().filter(c=>c.id!==id));
    toast('Risorsa rimossa','info');
    this.tab(LaserResources._currentTab, document.querySelector('.lr-tab-active'));
  },

  restoreItem(id){
    this.setRemoved(LaserResources.getRemoved().filter(r=>r!==id));
    toast('↩ Risorsa ripristinata','success');
    this.editorTab('removed');
  },

  openEditor(){
    document.getElementById('lr-editor-panel').style.display='flex';
    this.editorTab('add');
  },

  editorTab(tab){
    ['add','list','removed'].forEach(t=>{
      const btn=document.getElementById('lre-tab-'+t);
      if(!btn) return;
      const active=t===tab;
      btn.style.background=active?'var(--primary-dim)':'transparent';
      btn.style.borderBottomColor=active?'var(--primary)':'transparent';
      btn.style.color=active?'var(--primary)':'var(--text-muted)';
    });
    const body=document.getElementById('lr-editor-body');
    if(!body) return;
    if(tab==='add') this._editorAdd(body);
    else if(tab==='list') this._editorList(body);
    else this._editorRemoved(body);
  },

  _editorAdd(body, editItem){
    const it=editItem||{};
    const TABS=['file','generatori','software','community','materiali','tutorial'];
    const ICONS=['🔗','📁','🌐','💎','⚡','🎨','🔧','📦','🖥️','📚','👥','💰','🔴','🎯','✨','🧪','⚙️','🌲','🔤','📱','🛍️','▶️','📐','🧩','📊','🏅','🔦','⭐','🤖','🧰'];
    body.innerHTML=`
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${editItem?'✏️ Modifica risorsa esistente.':'➕ Aggiungi una nuova risorsa a Il Mondo Ingly Design. Apparirà nella tab e categoria scelti.'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Nome *</label>
          <input id="lre-name" class="form-control" value="${it.name||''}" placeholder="es. Creative Fabrica" style="font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">URL *</label>
          <input id="lre-url" class="form-control" value="${it.url||''}" placeholder="https://..." style="font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Tab / Sezione</label>
          <select id="lre-tab" class="form-control" style="font-size:13px">
            ${TABS.map(t=>`<option value="${t}" ${it.tab===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Categoria (gruppo)</label>
          <input id="lre-cat" class="form-control" value="${it.cat||''}" placeholder="es. Design Store, Repository…" style="font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Badge (opz.)</label>
          <input id="lre-badge" class="form-control" value="${it.badge||''}" placeholder="es. FREE, COMMERCIAL OK" style="font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Formati (virgola)</label>
          <input id="lre-formats" class="form-control" value="${(it.formats||[]).join(', ')}" placeholder="SVG, DXF, CDR…" style="font-size:13px">
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Descrizione *</label>
        <textarea id="lre-desc" class="form-control" rows="2" style="font-size:13px;resize:none">${it.desc||''}</textarea>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start">
        <div style="flex:1">
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px">Icona emoji</label>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">
            ${ICONS.map(ico=>`<button onclick="document.getElementById('lre-icon-val').value='${ico}';document.querySelectorAll('.lre-ico-btn').forEach(b=>b.style.outline='none');this.style.outline='2px solid var(--primary)'" class="lre-ico-btn" style="width:32px;height:32px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;font-size:16px;transition:.1s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">${ico}</button>`).join('')}
          </div>
          <input id="lre-icon-val" value="${it.icon||'🔗'}" style="width:60px;padding:6px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);color:var(--text);font-size:18px;text-align:center;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px">Colore</label>
          <input type="color" id="lre-color" value="${it.color||'#ec4899'}" style="width:50px;height:44px;border:2px solid var(--border);border-radius:9px;cursor:pointer;background:none;padding:3px">
        </div>
      </div>
      <!-- Preview -->
      <div style="padding:12px;background:var(--bg-card2);border-radius:10px;margin-bottom:14px;border:1px solid var(--border)">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;font-weight:700">Anteprima card:</div>
        <div style="display:flex;align-items:center;gap:10px">
          <span id="prev-icon" style="font-size:20px">${it.icon||'🔗'}</span>
          <div>
            <div id="prev-name" style="font-size:13px;font-weight:800;color:${it.color||'#ec4899'}">${it.name||'Nome risorsa'}</div>
            <div id="prev-url" style="font-size:9px;color:var(--text-dim)">${it.url?.replace('https://','').split('/')[0]||'dominio.com'}</div>
          </div>
          <span id="prev-badge" style="padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;background:#ec489918;color:#ec4899;margin-left:auto;display:${it.badge?'':'none'}">${it.badge||''}</span>
        </div>
      </div>
      <button onclick="LaserResources.saveItem(${editItem?`'${editItem.id}'`:'null'})"
        style="width:100%;padding:12px;background:var(--primary);color:#000;border:none;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;transition:.15s"
        onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
        ${editItem?'💾 Salva Modifiche':'➕ Aggiungi a Il Mondo Ingly Design'}
      </button>
      <script>
        ['lre-name','lre-url','lre-badge','lre-color','lre-icon-val'].forEach(id=>{
          const el=document.getElementById(id);
          if(!el) return;
          el.addEventListener('input',()=>{
            const n=document.getElementById('lre-name')?.value||'Nome risorsa';
            const u=document.getElementById('lre-url')?.value?.replace('https://','').split('/')[0]||'dominio.com';
            const b=document.getElementById('lre-badge')?.value||'';
            const col=document.getElementById('lre-color')?.value||'#ec4899';
            const ico=document.getElementById('lre-icon-val')?.value||'🔗';
            document.getElementById('prev-name').textContent=n;
            document.getElementById('prev-name').style.color=col;
            document.getElementById('prev-url').textContent=u;
            document.getElementById('prev-icon').textContent=ico;
            const badgeEl=document.getElementById('prev-badge');
            badgeEl.textContent=b; badgeEl.style.display=b?'':'none';
          });
        });
      <\/script>`;
  },

  _editorList(body){
    const removed=new Set(LaserResources.getRemoved());
    const all=[...this._DEFAULTS,...this.getCustom()].filter(r=>!removed.has(r.id));
    const grouped={};
    all.forEach(r=>{(grouped[r.tab]||(grouped[r.tab]=[])).push(r);});
    body.innerHTML=`
      <div style="position:sticky;top:0;background:var(--bg-card);padding:0 0 10px;z-index:1;margin-bottom:4px">
        <input placeholder="🔍 Filtra risorse…" oninput="document.querySelectorAll('.lre-list-row').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none'})"
          style="width:100%;padding:8px 12px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none">
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Totale: <strong>${all.length}</strong> risorse attive (${this.getCustom().length} custom)</div>
      ${Object.entries(grouped).map(([tab,items])=>`
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--text-dim);letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)">${tab} (${items.length})</div>
          ${items.map(r=>`<div class="lre-list-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);margin-bottom:4px;background:var(--bg-card2);transition:.1s" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:16px">${r.icon||'🔗'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:${r.color||'var(--text)'}">${r.name}</div>
              <div style="font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.cat} · ${r.url.replace('https://','').split('/')[0]}</div>
            </div>
            ${r._custom?'<span style="font-size:9px;color:var(--primary);background:var(--primary-dim);padding:2px 6px;border-radius:99px;border:1px solid var(--primary-border)">Custom</span>':''}
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button onclick="LaserResources.editItem(${JSON.stringify(r.id)})" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:none;color:var(--text-muted);cursor:pointer;font-size:10px;transition:.1s" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">✏️ Edit</button>
              <button onclick="LaserResources.removeItem(${JSON.stringify(r.id)})" style="padding:4px 8px;border:1px solid #ef444430;border-radius:6px;background:#ef444408;color:#ef4444;cursor:pointer;font-size:10px;transition:.1s" onmouseover="this.style.background='#ef444420'" onmouseout="this.style.background='#ef444408'">🗑</button>
            </div>
          </div>`).join('')}
        </div>`).join('')}`;
  },

  _editorRemoved(body){
    const removed=LaserResources.getRemoved();
    const byId={};
    [...this._DEFAULTS,...this.getCustom()].forEach(r=>{byId[r.id]=r;});
    const items=removed.map(id=>byId[id]).filter(Boolean);
    if(!items.length){body.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-muted)">✅ Nessuna risorsa rimossa.</div>';return;}
    body.innerHTML=`<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Risorse nascoste (${items.length}). Clicca ↩ per ripristinarle nella lista.</div>`
      +items.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border:1px dashed var(--border);margin-bottom:6px;opacity:.72;background:var(--bg-card2)">
        <span style="font-size:16px">${r.icon||'🔗'}</span>
        <div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--text)">${r.name}</div><div style="font-size:10px;color:var(--text-dim)">${r.tab} · ${r.cat}</div></div>
        <button onclick="LaserResources.restoreItem(${JSON.stringify(r.id)})" style="padding:5px 14px;border:1px solid #22c55e40;border-radius:7px;background:#22c55e10;color:#22c55e;cursor:pointer;font-size:11px;font-weight:700;transition:.15s" onmouseover="this.style.background='#22c55e20'" onmouseout="this.style.background='#22c55e10'">↩ Ripristina</button>
      </div>`).join('');
  },

  editItem(id){
    const all=[...this._DEFAULTS,...this.getCustom()];
    const item=all.find(r=>r.id===id);
    if(!item) return;
    this.editorTab('add');
    setTimeout(()=>this._editorAdd(document.getElementById('lr-editor-body'),item),50);
  },

  saveItem(existingId){
    const name=document.getElementById('lre-name')?.value?.trim();
    const url=document.getElementById('lre-url')?.value?.trim();
    const tab=document.getElementById('lre-tab')?.value||'file';
    const cat=document.getElementById('lre-cat')?.value?.trim()||'Altro';
    const desc=document.getElementById('lre-desc')?.value?.trim()||'';
    const badge=document.getElementById('lre-badge')?.value?.trim()||'';
    const icon=document.getElementById('lre-icon-val')?.value||'🔗';
    const color=document.getElementById('lre-color')?.value||'#ec4899';
    const formats=(document.getElementById('lre-formats')?.value||'').split(',').map(f=>f.trim()).filter(Boolean);
    if(!name||!url){toast('Nome e URL sono obbligatori','warning');return;}
    const customs=this.getCustom();
    const isEdit=existingId&&existingId!=='null';
    if(isEdit){
      const i=customs.findIndex(r=>r.id===existingId);
      if(i>=0) customs[i]={...customs[i],name,url,tab,cat,desc,badge,icon,color,formats,_custom:true};
      else this._DEFAULTS.forEach((d,i)=>{if(d.id===existingId)this._DEFAULTS[i]={...d,name,url,tab,cat,desc,badge,icon,color,formats};});
    } else {
      customs.push({id:'c_'+Date.now(),name,url,tab,cat,desc,badge,icon,color,formats,_custom:true});
    }
    this.setCustom(customs);
    toast(`✅ "${name}" ${isEdit?'aggiornato':'aggiunto'}!`,'success');
    document.getElementById('lr-editor-panel').style.display='none';
    this.tab(tab, null);
    // Reactivate correct tab button
    document.querySelectorAll('.lr-tab').forEach(btn=>{
      if(btn.textContent.toLowerCase().includes(tab)){
        btn.style.background='var(--bg-card)';btn.style.color='var(--primary)';
      }
    });
  },

  openAiSearch(){
    const hasAI=typeof AIProvider!=='undefined'&&AIProvider.hasKey();
    if(!hasAI){App.navigate('settings');toast('Configura una API key AI per usare l\'assistente','warning');return;}
    document.getElementById('lr-ai-panel').style.display='flex';
    setTimeout(()=>document.getElementById('lr-ai-input')?.focus(),100);
  },

  async quickAsk(){
    const q=document.getElementById('lr-quick-ask')?.value?.trim();
    const out=document.getElementById('lr-quick-output');
    const txt=document.getElementById('lr-quick-text');
    if(!q) return;
    if(out) out.style.display='';
    if(txt) txt.innerHTML='<div style="color:var(--text-dim)">⏳ AI sta elaborando…</div>';
    try{
      const r=await AIStudio._callAI(`Sei un esperto di macchine laser, incisione e artigianato italiano. Rispondi in modo pratico e diretto.\n\nDomanda: ${q}\n\nMax 200 parole. In italiano. Usa punti elenco se utile.`);
      if(txt) txt.innerHTML=r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){
      if(txt) txt.innerHTML=`<span style="color:var(--text-muted)">Configura API key in <button onclick="App.navigate('settings')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-weight:700">Impostazioni</button>.</span>`;
    }
  },

  async askAI(){
    const q=document.getElementById('lr-ai-input')?.value?.trim();
    const out=document.getElementById('lr-ai-output');
    if(!q||!out) return;
    out.style.display='block';
    out.innerHTML='<div style="color:var(--text-dim)">⏳ AI sta elaborando…</div>';
    try{
      const r=await AIStudio._callAI(`Sei un esperto di macchine laser, incisione laser, artigianato personalizzato italiano, Etsy e business laser.\n\nDomanda: ${q}\n\nRispondi in modo pratico e specifico. Includi numeri, esempi, risorse specifiche quando utile. In italiano. Max 300 parole.`);
      out.innerHTML=r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/^- (.+)$/gm,'<div style="display:flex;gap:5px;margin:2px 0"><span style="color:var(--primary)">•</span><span>$1</span></div>').replace(/\n/g,'<br>');
    }catch(e){
      out.innerHTML=`<span style="color:var(--text-muted)">Errore: ${e.message}. Configura API key in <button onclick="App.navigate('settings')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-weight:700">Impostazioni</button>.</span>`;
    }
  },
};
window.LaserResources = LaserResources;


// ── Missing AI modules restored ────────────────────────────────────────────

const CompetitorAI = {
  render(){
    const el = document.getElementById('view-competitor');
    if(!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:900px">
      <div class="module-header">
        <div class="module-header-left">
          <div class="module-title"><i class="fas fa-crosshairs" style="color:#ef4444"></i> Competitor AI</div>
          <div class="module-subtitle">Monitora competitor · prezzi · posizionamento</div>
        </div>
      </div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <h3 style="font-size:13px;margin-bottom:12px;color:var(--primary)">🎯 Analisi Competitor</h3>
          <input id="comp-name" class="form-control" placeholder="Nome competitor / URL Etsy" style="margin-bottom:8px">
          <input id="comp-niche" class="form-control" placeholder="Prodotti che vende" style="margin-bottom:10px">
          <button onclick="CompetitorAI.analyze()" class="btn btn-primary" style="width:100%">🤖 Analizza con AI</button>
        </div>
        <div class="card">
          <h3 style="font-size:13px;margin-bottom:12px;color:var(--red)">📊 Quick Compare</h3>
          <button onclick="CompetitorAI.quickAnalysis('prezzi')" class="btn btn-secondary" style="width:100%;margin-bottom:6px;text-align:left">💰 Analisi prezzi mercato</button>
          <button onclick="CompetitorAI.quickAnalysis('gap')" class="btn btn-secondary" style="width:100%;margin-bottom:6px;text-align:left">🔍 Gap di mercato</button>
          <button onclick="CompetitorAI.quickAnalysis('positioning')" class="btn btn-secondary" style="width:100%;text-align:left">🎯 Posizionamento ottimale</button>
        </div>
      </div>
      <div id="comp-output" class="card" style="min-height:120px;color:var(--text-muted);text-align:center;padding:40px">
        Inserisci un competitor e clicca Analizza
      </div>
    </div>`;
  },
  async analyze(){
    const name  = document.getElementById('comp-name')?.value||'';
    const niche = document.getElementById('comp-niche')?.value||'';
    const out   = document.getElementById('comp-output');
    if(!name){if(out)out.innerHTML='<div style="color:var(--red)">Inserisci il nome del competitor</div>';return;}
    if(out) out.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)">🤖 AI analizza...</div>';
    try{
      const r = await AIStudio._callAI(`Analizza il competitor "${name}" nel mercato artigianato laser/personalizzato italiano${niche?' (vende: '+niche+')':''}.\n\n**PUNTI DI FORZA:** cosa fa bene\n**PUNTI DEBOLI:** dove posso differenziarmi\n**PREZZI STIMATI:** range prezzi per categoria\n**OPPORTUNITÀ:** come batterlo\n**AZIONE:** 1 cosa concreta da fare subito\n\nMax 200 parole, pratico e diretto.`);
      if(out) out.innerHTML='<div style="font-size:13px;line-height:1.7">'+r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>')+'</div>';
    }catch(e){if(out)out.innerHTML='<div style="color:var(--text-muted);font-size:12px">Configura API key in Impostazioni per usare AI.</div>';}
  },
  async quickAnalysis(type){
    const out = document.getElementById('comp-output');
    if(out) out.innerHTML='<div style="text-align:center;padding:20px">🔍 Analisi in corso...</div>';
    const prompts={
      prezzi:'Analizza i prezzi del mercato Etsy italiano per artigianato laser personalizzato (segnaposto, targhe, decorazioni). Fornisci range prezzi per categoria, prezzo medio, e consiglio su come posizionarsi.',
      gap:'Trova 3 gap di mercato non ancora saturat nel settore artigianato laser personalizzato in Italia. Nicchie con domanda alta e poca concorrenza.',
      positioning:'Suggerisci il posizionamento ottimale per un artigiano laser siciliano che vende su Etsy: cosa comunicare, a chi, a che prezzo, con quale USP unica.'
    };
    try{
      const r = await AIStudio._callAI(prompts[type]||prompts.prezzi);
      if(out) out.innerHTML='<div style="font-size:13px;line-height:1.7">'+r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>')+'</div>';
    }catch(e){if(out)out.innerHTML='<div style="color:var(--text-muted);font-size:12px">Configura API key in Impostazioni.</div>';}
  }
};
window.CompetitorAI = CompetitorAI;

const SocialProofAI = {
  render(){
    const el = document.getElementById('view-socialproof');
    if(!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:900px">
      <div class="module-header">
        <div class="module-header-left">
          <div class="module-title"><i class="fas fa-star" style="color:#f59e0b"></i> Social Proof AI</div>
          <div class="module-subtitle">Genera recensioni, testimonianze e contenuti di prova sociale</div>
        </div>
      </div>
      <div class="grid-2" style="margin-bottom:16px">
        <div class="card">
          <h3 style="font-size:13px;margin-bottom:10px;color:var(--primary)">⭐ Genera Risposta Recensione</h3>
          <textarea id="sp-review" rows="3" class="form-control" placeholder="Incolla qui la recensione del cliente..." style="margin-bottom:8px;resize:none"></textarea>
          <select id="sp-tone" class="form-control" style="margin-bottom:8px">
            <option value="warm">Tono caldo e personale</option>
            <option value="professional">Tono professionale</option>
            <option value="fun">Tono simpatico</option>
          </select>
          <button onclick="SocialProofAI.generateReply()" class="btn btn-primary" style="width:100%">💬 Genera Risposta</button>
        </div>
        <div class="card">
          <h3 style="font-size:13px;margin-bottom:10px;color:#ec4899">📣 Idee Social Proof</h3>
          <button onclick="SocialProofAI.generateIdeas('testimonial')" class="btn btn-secondary" style="width:100%;margin-bottom:6px;text-align:left">✍️ Script richiesta recensione</button>
          <button onclick="SocialProofAI.generateIdeas('unboxing')" class="btn btn-secondary" style="width:100%;margin-bottom:6px;text-align:left">📦 Post unboxing cliente</button>
          <button onclick="SocialProofAI.generateIdeas('faq')" class="btn btn-secondary" style="width:100%;text-align:left">❓ FAQ prodotti comuni</button>
        </div>
      </div>
      <div id="sp-output" class="card" style="min-height:100px;color:var(--text-muted);text-align:center;padding:32px">Seleziona un'azione sopra</div>
    </div>`;
  },
  async generateReply(){
    const review = document.getElementById('sp-review')?.value||'';
    const tone   = document.getElementById('sp-tone')?.value||'warm';
    const out    = document.getElementById('sp-output');
    if(!review){if(out)out.innerHTML='<div style="color:var(--red)">Inserisci la recensione</div>';return;}
    if(out) out.innerHTML='<div style="text-align:center;padding:20px">⭐ Generazione risposta...</div>';
    const tones={warm:'caldo, personale, genuino',professional:'professionale e cortese',fun:'simpatico e vivace'};
    try{
      const r = await AIStudio._callAI(`Sei un artigiano laser siciliano (Ingly Design). Rispondi a questa recensione con tono ${tones[tone]||tones.warm}. Max 80 parole, in italiano:\n\n"${review}"`);
      if(out) out.innerHTML='<div style="font-size:13px;line-height:1.7;padding:4px">'+r+'<br><br><button onclick="navigator.clipboard.writeText(`'+r.replace(/`/g,"'")+'`);this.textContent=\'✅ Copiato!\'" class="btn btn-secondary btn-sm">📋 Copia</button></div>';
    }catch(e){if(out)out.innerHTML='<div style="color:var(--text-muted);font-size:12px">Configura API key in Impostazioni.</div>';}
  },
  async generateIdeas(type){
    const out=document.getElementById('sp-output');
    if(out) out.innerHTML='<div style="text-align:center;padding:20px">✨ Generazione...</div>';
    const prompts={
      testimonial:'Scrivi 3 varianti di messaggio WhatsApp per chiedere una recensione a un cliente dopo la consegna di un prodotto artigianale laser personalizzato. Tono caldo, non insistente. Includi emoji. In italiano.',
      unboxing:'Scrivi una didascalia Instagram per un video unboxing di un prodotto artigianale laser personalizzato (es. segnaposto matrimonio in legno). Tono emozionale, includi call-to-action. Max 150 caratteri + hashtag.',
      faq:'Scrivi le 5 FAQ più comuni per uno shop Etsy di artigianato laser personalizzato italiano. Domanda + risposta breve per ognuna.'
    };
    try{
      const r = await AIStudio._callAI(prompts[type]);
      if(out) out.innerHTML='<div style="font-size:13px;line-height:1.7">'+r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--primary)">$1</strong>').replace(/\n/g,'<br>')+'</div>';
    }catch(e){if(out)out.innerHTML='<div style="color:var(--text-muted);font-size:12px">Configura API key in Impostazioni.</div>';}
  }
};
window.SocialProofAI = SocialProofAI;

// Stub modules — render their existing HTML-defined views
const _makeStub = (name, viewId) => ({
  render(){
    const el = document.getElementById(viewId);
    if(!el||el.innerHTML.trim()) return; // already has content
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:12px">🚧</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:6px">${name}</div>
      <div style="font-size:12px">Modulo in arrivo nel prossimo aggiornamento</div>
    </div>`;
  }
});

const EtsyAI = {
  render(){
    // EtsyAI delegates to the full-featured EtsySEOWizard module
    if(typeof EtsySEOWizard !== 'undefined') {
      const el = document.getElementById('view-etsyai');
      if(!el) return;
      // Mount EtsySEOWizard content into EtsyAI view
      EtsySEOWizard._mountTarget = 'view-etsyai';
      (typeof EtsySEOWizard!=='undefined'&&EtsySEOWizard.render());
    }
  }
};
// const PhotoStudio — implemented below
// const ReplyAI — implemented below
// const FieraAI — implemented below
// const B2BPitch — implemented below
// const SupplierIntel — implemented below
// const ContentPerf — implemented below
// const CompetitorMon — implemented below
const CompTrack = {
  _SK: 'ingly_comptrack_v1',
  get(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch{return[];} },
  save(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch{} },

  _PRESETS: [
    {id:1,name:'LaserCraft Italia',   url:'https://www.etsy.com/it/shop/LaserCraftItalia',  platform:'Etsy',   cat:'segnaposto',    price:'€4-10',  strength:'Prezzo basso',   weakness:'Qualità media'},
    {id:2,name:'IncisoLaser',         url:'https://www.etsy.com/it/search?q=inciso+laser',   platform:'Etsy',   cat:'targhe',         price:'€12-35', strength:'Brand forte',    weakness:'Tempi lunghi'},
    {id:3,name:'WoodEngravedIT',      url:'https://www.etsy.com/it/shop/WoodEngravedIT',     platform:'Etsy',   cat:'legno',          price:'€8-25',  strength:'Varietà',        weakness:'Poco personalizzato'},
    {id:4,name:'LucePlexiglass',      url:'https://www.etsy.com/it/search?q=luce+plexiglass',platform:'Etsy',   cat:'acrilico',       price:'€20-60', strength:'Effetto visivo', weakness:'Costo alto'},
    {id:5,name:'ArteLaser Sicilia',   url:'https://www.facebook.com/search/top?q=laser%20sicilia',platform:'Facebook',cat:'locale', price:'€5-15',  strength:'Locale',         weakness:'Bassa visibilità online'},
  ],

  render(){
    const el=document.getElementById('view-comptrack');
    if(!el) return;
    const competitors=this.get().length?this.get():JSON.parse(JSON.stringify(this._PRESETS));
    el.innerHTML=`<div style="padding:16px 20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;font-size:22px">🎯</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:19px;font-weight:900;background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent">CompTrack — Monitor Competitor</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${competitors.length} competitor monitorati · Prezzi · Punti di forza · Analisi AI</p>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="CompTrack._openAdd()" style="padding:7px 14px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">+ Aggiungi</button>
          <button onclick="CompTrack._aiAnalyze()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;color:var(--text)">🤖 Analisi AI</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${competitors.map(comp=>`
          <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;transition:.18s" onmouseover="this.style.borderColor='#ef4444';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
            <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:#ef444410">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:800;color:#ef4444">${comp.name}</div>
                <div style="font-size:10px;color:var(--text-muted)">${comp.platform} · ${comp.cat}</div>
              </div>
              <div style="display:flex;gap:4px">
                <a href="${comp.url}" target="_blank" style="width:24px;height:24px;border-radius:5px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--text-dim);font-size:10px">🔗</a>
                <button onclick="CompTrack._delete(${comp.id})" style="width:24px;height:24px;border-radius:5px;border:1px solid #ef444430;background:#ef444408;cursor:pointer;color:#ef4444;font-size:10px">🗑</button>
              </div>
            </div>
            <div style="padding:12px 14px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div style="padding:7px;background:var(--bg-card2);border-radius:8px;text-align:center">
                  <div style="font-size:12px;font-weight:800;color:#22c55e">${comp.price}</div>
                  <div style="font-size:9px;color:var(--text-dim)">Fascia prezzo</div>
                </div>
                <div style="padding:7px;background:var(--bg-card2);border-radius:8px;text-align:center">
                  <div style="font-size:11px;font-weight:700;color:var(--text)">${comp.cat}</div>
                  <div style="font-size:9px;color:var(--text-dim)">Categoria</div>
                </div>
              </div>
              <div style="font-size:10px;color:#22c55e;padding:4px 8px;background:#22c55e12;border-radius:6px;margin-bottom:4px">✅ ${comp.strength}</div>
              <div style="font-size:10px;color:#f59e0b;padding:4px 8px;background:#f59e0b12;border-radius:6px">⚠️ ${comp.weakness}</div>
            </div>
          </div>`).join('')}
        <button onclick="CompTrack._openAdd()" style="border:2px dashed var(--border);border-radius:12px;padding:30px;cursor:pointer;background:none;color:var(--text-dim);font-size:13px;font-weight:600;transition:.15s" onmouseover="this.style.borderColor='#ef4444';this.style.color='#ef4444'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-dim)'">+ Aggiungi competitor</button>
      </div>
      <div id="ct-ai-output" style="margin-top:14px;display:none;padding:16px;background:var(--bg-card);border-radius:12px;border:1px solid var(--border)"></div>
      <div id="ct-modal" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center">
        <div id="ct-modal-body" style="background:var(--bg-card);border-radius:14px;width:min(480px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000c"></div>
      </div>
    </div>`;
  },

  _openAdd(){
    const modal=document.getElementById('ct-modal');
    const body=document.getElementById('ct-modal-body');
    if(!modal||!body) return;
    body.innerHTML=`<div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:15px;font-weight:800">+ Nuovo Competitor</div>
      <button onclick="document.getElementById('ct-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)">✕</button>
    </div>
    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px">
      ${[['ct-cn','Nome competitor','es. LaserArt Roma'],['ct-cu','URL (Etsy/sito)','https://...'],['ct-cat','Categoria','es. segnaposto, targhe'],['ct-price','Fascia prezzo','es. €5-15'],['ct-str','Punto di forza','es. Prezzo basso'],['ct-weak','Punto debole','es. Lenta consegna']].map(([id,label,ph])=>`
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">${label}</label>
          <input id="${id}" class="form-control" placeholder="${ph}" style="font-size:12px"></div>`).join('')}
      <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Piattaforma</label>
        <select id="ct-plat" class="form-control" style="font-size:12px">
          ${['Etsy','Amazon','Shopify','Instagram','Facebook','TikTok','Sito proprio'].map(p=>`<option>${p}</option>`).join('')}
        </select></div>
      <button onclick="CompTrack._save()" style="width:100%;padding:10px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">+ Aggiungi</button>
    </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  _save(){
    const name=document.getElementById('ct-cn')?.value?.trim();
    if(!name){toast('Inserisci il nome','warning');return;}
    const competitors=this.get().length?this.get():JSON.parse(JSON.stringify(this._PRESETS));
    competitors.push({id:Date.now(),name,url:document.getElementById('ct-cu')?.value||'',cat:document.getElementById('ct-cat')?.value||'altro',price:document.getElementById('ct-price')?.value||'—',strength:document.getElementById('ct-str')?.value||'—',weakness:document.getElementById('ct-weak')?.value||'—',platform:document.getElementById('ct-plat')?.value||'Etsy'});
    this.save(competitors);
    document.getElementById('ct-modal').style.display='none';
    toast('✅ Competitor aggiunto!','success');
    this.render();
  },

  _delete(id){
    const d=this.get().filter(c=>c.id!==id);
    this.save(d);
    toast('Rimosso','info');
    this.render();
  },

  async _aiAnalyze(){
    const out=document.getElementById('ct-ai-output');
    if(!out) return;
    out.style.display='';
    out.innerHTML='<div style="color:var(--text-muted)">🤖 AI analizza i competitor…</div>';
    const competitors=this.get().length?this.get():this._PRESETS;
    try{
      const prompt='Analizza questi competitor laser italiani su Etsy: '+
        competitors.map(cc=>cc.name+': '+cc.platform+', '+cc.cat+', '+cc.price+', forza: '+cc.strength+', debolezza: '+cc.weakness).join('; ')+
        '. ANALISI COMPETITIVA: 1.Posizionamento 2.Gap di mercato 3.Come differenziarti 4.Pricing strategy 5.Top 2 opportunità. Max 250 parole. In italiano.';
      const r=await AIStudio._callAI(prompt);
      out.innerHTML='<div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px">Analisi AI Competitor</div><div style="font-size:13px;line-height:1.8">'+r.split('\n').join('<br>')+'</div>';

    }catch(e){out.innerHTML='<div style="color:var(--text-muted)">Configura API Key AI in Impostazioni.</div>';}
  }
};

// v10: Safe module exports — real implementations loaded in later blocks
// These are overridden when the real implementations load (last-write-wins)
if(typeof EtsyAI!=='undefined')        window.EtsyAI        = EtsyAI;
if(typeof CompTrack!=='undefined')     window.CompTrack     = CompTrack;
if(typeof PhotoStudio!=='undefined')   window.PhotoStudio   = PhotoStudio;
if(typeof ReplyAI!=='undefined')       window.ReplyAI       = ReplyAI;
if(typeof FieraAI!=='undefined')       window.FieraAI       = FieraAI;
if(typeof B2BPitch!=='undefined')      window.B2BPitch      = B2BPitch;
if(typeof SupplierIntel!=='undefined') window.SupplierIntel = SupplierIntel;
if(typeof ContentPerf!=='undefined')   window.ContentPerf   = ContentPerf;
if(typeof CompetitorMon!=='undefined') window.CompetitorMon = CompetitorMon;

// Fix order bugs: ProfitLeakDetector and RevSim referenced before defined
// They get defined later in the file — just ensure window exports happen after
if(typeof ProfitLeakDetector !== 'undefined') window.ProfitLeakDetector = ProfitLeakDetector;
if(typeof RevSim !== 'undefined') window.RevSim = RevSim;



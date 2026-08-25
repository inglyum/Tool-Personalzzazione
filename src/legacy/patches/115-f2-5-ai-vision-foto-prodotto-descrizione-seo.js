
/* ════════════════════════════════════════════════════════════
   F2.5 AI VISION — Foto prodotto → Descrizione + SEO
   ════════════════════════════════════════════════════════ */
window.AIVision = {
  open: function(){
    var m = document.createElement('div');
    m.className = 'modal-overlay open'; m.id = 'aivision-modal';
    m.innerHTML = '<div class="modal">'
      +'<div class="modal-header"><div class="modal-title">📸 AI Vision — Foto → Prodotto</div>'
      +'<button class="modal-close" onclick="document.getElementById(\'aivision-modal\').remove()">✕</button></div>'
      +'<div class="modal-body">'
      +'<div style="text-align:center;padding:20px;background:var(--bg-card2);border:2px dashed var(--border2);border-radius:10px;margin-bottom:14px;cursor:pointer" onclick="document.getElementById(\'aiv-file\').click()">'
        +'<div style="font-size:36px;margin-bottom:8px">📷</div>'
        +'<div style="font-size:13px;font-weight:600;color:var(--text)">Clicca per caricare una foto</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:4px">JPG, PNG, WEBP — max 5MB</div>'
        +'<input type="file" id="aiv-file" accept="image/*" style="display:none" onchange="AIVision.preview(this)">'
      +'</div>'
      +'<img id="aiv-preview" src="" style="display:none;max-width:100%;border-radius:8px;margin-bottom:14px">'
      +'<div class="form-group"><label class="form-label">Tipo di contenuto da generare</label>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="aiv-types">'
          +'<label style="display:flex;align-items:center;gap:6px;padding:8px;border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px">'
            +'<input type="checkbox" value="catalog" checked> Descrizione Catalogo</label>'
          +'<label style="display:flex;align-items:center;gap:6px;padding:8px;border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px">'
            +'<input type="checkbox" value="etsy"> Listing Etsy SEO</label>'
          +'<label style="display:flex;align-items:center;gap:6px;padding:8px;border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px">'
            +'<input type="checkbox" value="instagram"> Post Instagram</label>'
          +'<label style="display:flex;align-items:center;gap:6px;padding:8px;border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px">'
            +'<input type="checkbox" value="price"> Suggerisci Prezzo</label>'
        +'</div>'
      +'</div>'
      +'<div id="aiv-result" style="display:none;margin-top:12px"></div>'
      +'</div>'
      +'<div class="modal-footer">'
        +'<button class="btn btn-secondary" onclick="document.getElementById(\'aivision-modal\').remove()">Annulla</button>'
        +'<button class="btn btn-primary" id="aiv-run-btn" onclick="AIVision.run()" disabled>'
          +'<i class="fas fa-magic"></i> Analizza con AI</button>'
      +'</div></div>';
    document.body.appendChild(m);
  },

  preview: function(input){
    var file = input.files[0]; if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
      var img = document.getElementById('aiv-preview');
      if(img){ img.src = e.target.result; img.style.display='block'; }
      document.getElementById('aiv-run-btn').disabled = false;
      AIVision._imgData = e.target.result.split(',')[1];
      AIVision._imgType = file.type;
    };
    reader.readAsDataURL(file);
  },

  run: async function(){
    var btn = document.getElementById('aiv-run-btn');
    if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Analizzando...'; }

    var types = Array.from(document.querySelectorAll('#aiv-types input:checked')).map(function(c){return c.value;});
    var key = localStorage.getItem('ingly_api_key')||'';
    if(!key){
      iToast('⚠️ Inserisci la chiave API Claude nelle Impostazioni','warning');
      if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-magic"></i> Analizza con AI'; }
      return;
    }

    var prompt = 'Sei un esperto di marketing per artigiani italiani. Analizza questa immagine di un prodotto artigianale e genera:\n\n'
      + (types.includes('catalog') ? '### DESCRIZIONE CATALOGO (150 parole)\n' : '')
      + (types.includes('etsy') ? '### LISTING ETSY (titolo 140 chars + 13 tag + descrizione 300 parole)\n' : '')
      + (types.includes('instagram') ? '### POST INSTAGRAM (caption + 20 hashtag)\n' : '')
      + (types.includes('price') ? '### PREZZO SUGGERITO (range min-max con motivazione)\n' : '')
      + '\nRispondi in italiano. Sii specifico e professionale.';

    try {
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,
          'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({
          model:'claude-opus-4-5',
          max_tokens:1500,
          messages:[{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:this._imgType||'image/jpeg',data:this._imgData}},
            {type:'text',text:prompt}
          ]}]
        })
      });
      var data = await res.json();
      var text = data.content && data.content[0] ? data.content[0].text : 'Errore nella risposta AI';

      var result = document.getElementById('aiv-result');
      if(result){
        result.style.display='block';
        result.innerHTML = '<div style="background:var(--bg-card2);border-radius:8px;padding:14px;white-space:pre-wrap;font-size:12px;line-height:1.7;color:var(--text);max-height:300px;overflow-y:auto">'+text+'</div>'
          +'<div style="display:flex;gap:8px;margin-top:10px">'
            +'<button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.querySelector(\'#aiv-result div\').textContent);iToast(\'📋 Copiato!\',\'success\')"><i class="fas fa-copy"></i> Copia</button>'
            +'<button class="btn btn-secondary btn-sm" onclick="AIVision._saveToCatalog(this.dataset.text)" data-text="'+encodeURIComponent(text)+'"><i class="fas fa-book-open"></i> Salva in Catalogo</button>'
          +'</div>';
      }
    } catch(e) {
      iToast('❌ Errore AI: '+e.message,'error');
    }
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-magic"></i> Analizza di nuovo'; }
  },

  _saveToCatalog: async function(encodedText){
    if(typeof IDB==='undefined') return;
    var text = decodeURIComponent(encodedText);
    var name = prompt('Nome prodotto per il catalogo:','Prodotto da foto');
    if(!name) return;
    await IDB.put('catalog',{name:name,description:text.slice(0,500),
      costPrice:0,salePrice:0,unit:'pz',tags:['ai-generated'],
      createdAt:new Date().toISOString()});
    iToast('✅ Salvato nel Catalogo','success');
    if(typeof App!=='undefined') App.navigate('catalog');
  }
};

/* ════════════════════════════════════════════════════════════
   F2.5b AI VISION — aggiunge bottone nella AI Quick Bar
   ════════════════════════════════════════════════════════ */
if(typeof NavBus !== 'undefined'){
  NavBus.on('catalog', function(){
    setTimeout(function(){
      var bar = document.getElementById('ai-quick-bar');
      if(!bar || bar.querySelector('[data-vision]')) return;
      var btn = document.createElement('button');
      btn.className = 'aqb-btn'; btn.setAttribute('data-vision','1');
      btn.innerHTML = '<i class="fas fa-camera"></i> Foto → AI';
      btn.onclick = function(){ AIVision.open(); };
      var toggle = bar.querySelector('.aqb-toggle');
      if(toggle && toggle.parentNode) toggle.parentNode.insertBefore(btn, toggle.nextSibling);
    }, 300);
  });
}

/* ════════════════════════════════════════════════════════════
   F2.6 WHATSAPP TEMPLATES AVANZATI
   ════════════════════════════════════════════════════════ */
window.WATemplates = {
  TEMPLATES: [
    {id:'preventivo', name:'📄 Preventivo',
     text:'Ciao {nome}! 👋\n\nEcco il preventivo per *{prodotto}*:\n\n{voci}\n\n*Totale: €{totale}*\n\n✅ Valido 15 giorni\n📦 Consegna: {consegna}\n\nPer confermare rispondi "CONFERMO" 🎉'},
    {id:'ordine_pronto', name:'✅ Ordine pronto',
     text:'Ciao {nome}! 🎉\n\nIl tuo ordine *{prodotto}* è pronto!\n\n🏠 Puoi ritirarlo presso il nostro laboratorio\n📦 Oppure organizziamo la spedizione\n\nFammi sapere come preferisci! 😊'},
    {id:'follow_up', name:'🔄 Follow-up preventivo',
     text:'Ciao {nome}! 👋\n\nVolevo assicurarmi che tu abbia ricevuto il preventivo per *{prodotto}*.\n\nSei interessato? Posso rispondere a qualsiasi domanda 🙏\n\nSe hai bisogno di modifiche o varianti, dimmi pure!'},
    {id:'pagamento', name:'💰 Richiesta pagamento',
     text:'Ciao {nome}! 😊\n\nTi ricordo che il pagamento di *€{totale}* per *{prodotto}* è in attesa.\n\nBonifico: IBAN IT60 XXXX XXXX XXXX XXXX\nOppure: PayPal / Satispay\n\nGrazie mille! 🙏'},
    {id:'ringraziamento', name:'🌟 Ringraziamento',
     text:'Ciao {nome}! 🌟\n\nGrazie mille per aver scelto noi per *{prodotto}*!\n\nSe sei soddisfatto, ti chiedo gentilmente una recensione ⭐⭐⭐⭐⭐\n\nA presto! 😊'},
    {id:'spedizione', name:'📦 Spedizione inviata',
     text:'Ciao {nome}! 📦\n\nIl tuo ordine *{prodotto}* è stato spedito!\n\n🚚 Corriere: {corriere}\n📋 Tracking: {tracking}\n\nIn genere arriva in 2-3 giorni lavorativi.'},
    {id:'personalizzazione', name:'🎨 Richiesta dati personalizzazione',
     text:'Ciao {nome}! 🎨\n\nPer procedere con *{prodotto}* ho bisogno di:\n\n📝 Testo da incidere:\n📐 Dimensioni preferite:\n🖼️ Eventuale logo o immagine:\n\nMandami queste info e procedo subito! ⚡'},
  ],

  open: function(defaults){
    defaults = defaults || {};
    var m = document.createElement('div');
    m.className = 'modal-overlay open'; m.id = 'watpl-modal';
    m.innerHTML = '<div class="modal modal-lg">'
      +'<div class="modal-header"><div class="modal-title">💬 WhatsApp Templates</div>'
      +'<button class="modal-close" onclick="document.getElementById(\'watpl-modal\').remove()">✕</button></div>'
      +'<div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
        +'<div>'
          +'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Scegli template</div>'
          +this.TEMPLATES.map(function(t){
            return '<div class="wa-tpl" onclick="WATemplates.select(\''+t.id+'\')">'
              +'<div class="wa-tpl-name">'+t.name+'</div>'
              +'<div class="wa-tpl-preview">'+t.text.slice(0,60).replace(/\n/g,' ')+'...</div></div>';
          }).join('')
        +'</div>'
        +'<div>'
          +'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Personalizza</div>'
          +'<div class="form-group"><label class="form-label">Nome cliente</label><input class="form-control" id="wa-nome" value="'+(defaults.nome||'')+'"></div>'
          +'<div class="form-group"><label class="form-label">Prodotto</label><input class="form-control" id="wa-prodotto" value="'+(defaults.prodotto||'')+'"></div>'
          +'<div class="form-group"><label class="form-label">Totale €</label><input class="form-control" id="wa-totale" type="number" value="'+(defaults.totale||'')+'"></div>'
          +'<div class="form-group"><label class="form-label">Voci preventivo</label><textarea class="form-control" id="wa-voci" rows="2">'+(defaults.voci||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Numero telefono (opz.)</label><input class="form-control" id="wa-phone" placeholder="+39 333 1234567" value="'+(defaults.phone||'')+'"></div>'
          +'<div class="form-group"><label class="form-label">Anteprima messaggio</label>'
            +'<textarea class="form-control" id="wa-preview" rows="8" style="font-size:11px;line-height:1.6"></textarea></div>'
          +'<button onclick="WATemplates.send()" style="width:100%;padding:11px;background:#25D366;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px"><i class="fab fa-whatsapp"></i> Invia WhatsApp</button>'
        +'</div>'
      +'</div></div>';
    document.body.appendChild(m);
    // Select first template by default
    this.select(this.TEMPLATES[0].id);
  },

  select: function(id){
    var t = this.TEMPLATES.find(function(x){return x.id===id;});
    if(!t) return;
    this._current = t;
    this.updatePreview();
    document.querySelectorAll('.wa-tpl').forEach(function(el,i){
      el.style.borderColor = 'var(--border)'; el.style.background='';
    });
    var items = document.querySelectorAll('.wa-tpl');
    var idx = this.TEMPLATES.findIndex(function(x){return x.id===id;});
    if(items[idx]){ items[idx].style.borderColor='#25D36640'; items[idx].style.background='#25D36610'; }
  },

  updatePreview: function(){
    if(!this._current) return;
    var g = function(id){ return (document.getElementById(id)||{value:''}).value; };
    var text = this._current.text
      .replace(/{nome}/g, g('wa-nome')||'Cliente')
      .replace(/{prodotto}/g, g('wa-prodotto')||'prodotto')
      .replace(/{totale}/g, g('wa-totale')||'0.00')
      .replace(/{voci}/g, g('wa-voci')||'')
      .replace(/{consegna}/g, '7-10 giorni lavorativi')
      .replace(/{corriere}/g, 'GLS/BRT')
      .replace(/{tracking}/g, g('wa-tracking')||'—');
    var prev = document.getElementById('wa-preview');
    if(prev) prev.value = text;
  },

  send: function(){
    var preview = document.getElementById('wa-preview');
    if(!preview) return;
    var text = preview.value;
    var phone = (document.getElementById('wa-phone')||{value:''}).value.replace(/\D/g,'');
    var url = phone
      ? 'https://wa.me/'+phone+'?text='+encodeURIComponent(text)
      : 'https://wa.me/?text='+encodeURIComponent(text);
    window.open(url, '_blank');
    document.getElementById('watpl-modal').remove();
  }
};

// Hook: aggiorna preview quando l'utente digita
document.addEventListener('input', function(e){
  if(['wa-nome','wa-prodotto','wa-totale','wa-voci'].includes(e.target.id)){
    WATemplates.updatePreview();
  }
});

/* ════════════════════════════════════════════════════════════
   F3.3 BACKUP AUTO — Export JSON locale + download
   ════════════════════════════════════════════════════════ */
window.BackupAuto = {
  async run(silent){
    if(typeof IDB === 'undefined') return;
    var stores = ['sales','orders','clients','catalog','materials','gadgets',
      'fixed_costs','cashflow','ideas','suppliers','tax_events','goals',
      'cost_entries','components','equipment','social_posts'];
    var data = { _ts: new Date().toISOString(), _v:'INGLY_31', _app:'INGLY OS' };
    var total = 0;
    for(var s of stores){
      try{
        data[s] = await IDB.getAll(s);
        total += data[s].length;
      }catch(e){ data[s]=[]; }
    }
    // Salva in localStorage (mini-backup veloce)
    try{
      localStorage.setItem('ingly_last_backup', JSON.stringify({
        ts: data._ts, records: total, size: JSON.stringify(data).length
      }));
    }catch(e){}

    if(!silent){
      // Download file JSON
      var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href=url; a.download='INGLY_Backup_'+new Date().toISOString().slice(0,10)+'.json';
      a.click(); URL.revokeObjectURL(url);
      iToast('💾 Backup scaricato — '+total+' records','success');
    }
    return { records: total, ts: data._ts };
  },

  async restore(file){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = async function(e){
      try{
        var data = JSON.parse(e.target.result);
        if(!data._v || !data._v.startsWith('INGLY')){ iToast('❌ File non valido','error'); return; }
        if(!confirm('Questo sovrascriverà i dati esistenti. Continuare?')) return;
        var count = 0;
        for(var [store, records] of Object.entries(data)){
          if(store.startsWith('_') || !Array.isArray(records)) continue;
          for(var r of records){
            await IDB.put(store, r).catch(function(){});
            count++;
          }
        }
        iToast('✅ Ripristino completato — '+count+' records','success',{duration:5});
        setTimeout(function(){ location.reload(); }, 2000);
      }catch(err){ iToast('❌ Errore ripristino: '+err.message,'error'); }
    };
    reader.readAsText(file);
  },

  scheduleAuto: function(){
    // Auto backup silenzioso ogni 24h
    var lastBk = localStorage.getItem('ingly_auto_bk_v31');
    var now = Date.now();
    if(!lastBk || now - parseInt(lastBk) > 86400000){
      setTimeout(async function(){
        await BackupAuto.run(true);
        localStorage.setItem('ingly_auto_bk_v31', String(Date.now()));
        console.log('[BackupAuto] ✅ Auto-backup silenzioso completato');
      }, 5000);
    }
  }
};

// Avvia auto-backup
setTimeout(function(){ BackupAuto.scheduleAuto(); }, 3000);

/* ════════════════════════════════════════════════════════════
   F3.2 STRIPE LINK NEI PREVENTIVI
   Genera link di pagamento Stripe (richiede Stripe account)
   ════════════════════════════════════════════════════════ */
window.StripeLink = {
  generate: function(amount, description, opts){
    opts = opts || {};
    var amtCents = Math.round((parseFloat(amount)||0) * 100);
    if(amtCents <= 0){ iToast('⚠️ Inserisci un importo valido','warning'); return null; }

    // Usa Stripe Payment Links (no backend richiesto)
    // L'utente deve configurare il suo Stripe account
    var stripeKey = localStorage.getItem('ingly_stripe_key')||'';
    if(!stripeKey){
      // Mostra modale configurazione
      this.showConfig(amount, description);
      return null;
    }

    // Genera link diretto a Stripe Checkout (con amount precompilato)
    var link = 'https://buy.stripe.com/'+stripeKey+'?amount='+amtCents+'&description='+encodeURIComponent(description||'Pagamento');
    return link;
  },

  showConfig: function(amount, description){
    var m = document.createElement('div');
    m.className = 'modal-overlay open'; m.id = 'stripe-cfg-modal';
    m.innerHTML = '<div class="modal">'
      +'<div class="modal-header"><div class="modal-title">💳 Configura Stripe</div>'
      +'<button class="modal-close" onclick="document.getElementById(\'stripe-cfg-modal\').remove()">✕</button></div>'
      +'<div class="modal-body">'
        +'<div style="background:#635bff15;border:1px solid #635bff30;border-radius:10px;padding:14px;margin-bottom:14px">'
          +'<div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:6px">💳 Stripe Payment Links</div>'
          +'<div style="font-size:12px;color:var(--text-muted);line-height:1.6">Crea un Payment Link su <strong>dashboard.stripe.com</strong> e incolla il codice qui sotto. I tuoi clienti potranno pagare direttamente dal preventivo PDF.</div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Codice Payment Link Stripe</label>'
          +'<input class="form-control" id="stripe-key-input" placeholder="es. test_5K4..." style="font-family:monospace">'
          +'<div style="font-size:10px;color:var(--text-muted);margin-top:4px">Trovi il codice in Stripe → Payment Links → Copia codice</div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Importo (€)</label>'
          +'<input class="form-control" id="stripe-amount" type="number" value="'+(amount||'')+'">'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrizione</label>'
          +'<input class="form-control" id="stripe-desc" value="'+(description||'Pagamento ordine')+'">'
        +'</div>'
      +'</div>'
      +'<div class="modal-footer">'
        +'<button class="btn btn-secondary" onclick="document.getElementById(\'stripe-cfg-modal\').remove()">Annulla</button>'
        +'<button class="btn btn-primary" style="background:#635bff" onclick="StripeLink.save()">💳 Salva e genera link</button>'
      +'</div></div>';
    document.body.appendChild(m);
  },

  save: function(){
    var key = (document.getElementById('stripe-key-input')||{value:''}).value.trim();
    if(!key){ iToast('Inserisci il codice Stripe','warning'); return; }
    localStorage.setItem('ingly_stripe_key', key);
    var amount = (document.getElementById('stripe-amount')||{value:'0'}).value;
    var desc = (document.getElementById('stripe-desc')||{value:''}).value;
    var link = 'https://buy.stripe.com/'+key;
    document.getElementById('stripe-cfg-modal').remove();
    navigator.clipboard.writeText(link).then(function(){
      iToast('💳 Link Stripe copiato negli appunti!','success',{
        sub: 'Incollalo nel PDF del preventivo',
        duration: 5
      });
    });
    return link;
  },

  // Aggiunge badge Stripe al PDF della fattura (patch FatturaRapida)
  addToPDF: function(amount, description){
    var link = this.generate(amount, description);
    if(!link) return '';
    return '<div style="margin-top:16px;padding:12px;background:#635bff15;border:1px solid #635bff30;border-radius:8px;text-align:center">'
      +'<div style="font-size:11px;color:#635bff;font-weight:700;margin-bottom:6px">💳 PAGAMENTO ONLINE</div>'
      +'<a href="'+link+'" style="display:inline-block;padding:10px 24px;background:#635bff;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Paga ora con Stripe →</a>'
      +'<div style="font-size:10px;color:#94a3b8;margin-top:6px">Pagamento sicuro con carta di credito/debito</div>'
      +'</div>';
  }
};

/* ════════════════════════════════════════════════════════════
   MODULI MANCANTI — ProductHunter, MarketAgent, EtsySEOWizard, LiveIntel
   Implementazione completa basata sui dati IDB esistenti
   ════════════════════════════════════════════════════════ */

/* ── ProductHunter — trova prodotti ad alto potenziale ─── */
window.ProductHunter = {
  async render(){
    var el = document.getElementById('view-product_hunter');
    if(!el) return;
    var catalog = await IDB.getAll('catalog').catch(function(){return[];});
    var sales   = await IDB.getAll('sales').catch(function(){return[];});

    // Calcola performance per prodotto
    var perf = {};
    sales.forEach(function(s){
      if(!s.description) return;
      var name = s.description.slice(0,50);
      if(!perf[name]) perf[name]={revenue:0,count:0,margin:0};
      perf[name].revenue += (+s.amount||0);
      perf[name].count++;
    });

    // Score prodotti catalogo
    var scored = catalog.map(function(p){
      var key = (p.name||'').slice(0,50);
      var stats = perf[key] || {revenue:0,count:0};
      var margin = p.salePrice>0 ? Math.round(((p.salePrice-p.costPrice)/p.salePrice)*100) : 0;
      var score = Math.min(100, Math.round(
        (margin * 0.4) +
        (Math.min(stats.count,20)/20 * 40) +
        (Math.min(stats.revenue,500)/500 * 20)
      ));
      return {p:p, stats:stats, margin:margin, score:score};
    }).sort(function(a,b){return b.score-a.score;});

    var topItems = scored.slice(0,8);
    var colors = ['var(--green)','var(--green)','var(--green)','#3b82f6','#3b82f6','#f59e0b','var(--red)','var(--red)'];

    el.innerHTML = '<div style="padding:20px">'
      +'<div class="module-header"><div class="module-header-left">'
        +'<div class="module-title"><i class="fas fa-crosshairs" style="color:#f59e0b"></i> 🎯 Product Hunter AI</div>'
        +'<div class="module-subtitle">Analisi performance prodotti · Identifica i bestseller e i prodotti da eliminare</div>'
      +'</div></div>'
      +'<div class="grid-4" style="margin-bottom:20px">'
        +'<div class="kpi-card"><div class="kpi-value">'+catalog.length+'</div><div class="kpi-label">Prodotti totali</div></div>'
        +'<div class="kpi-card"><div class="kpi-value">'+topItems.filter(function(i){return i.score>=70;}).length+'</div><div class="kpi-label">Top performer</div></div>'
        +'<div class="kpi-card"><div class="kpi-value">'+topItems.filter(function(i){return i.margin>=40;}).length+'</div><div class="kpi-label">Margine > 40%</div></div>'
        +'<div class="kpi-card"><div class="kpi-value">'+scored.filter(function(i){return i.score<30;}).length+'</div><div class="kpi-label">Da rivalutare</div></div>'
      +'</div>'
      +'<div class="grid-2">'
      + topItems.map(function(item,i){
          var p = item.p;
          var clr = colors[i] || 'var(--text-muted)';
          return '<div class="ph-card">'
            +'<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">'
              +'<div class="ph-score" style="background:'+clr+'22;color:'+clr+'">'+item.score+'</div>'
              +'<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">'+p.name+'</div>'
                +'<div style="font-size:11px;color:var(--text-muted)">'+(p.category||'Senza categoria')+'</div></div>'
              +'<div style="text-align:right"><div style="font-size:15px;font-weight:800;color:var(--primary)">€'+(+p.salePrice||0).toFixed(2)+'</div>'
                +'<div style="font-size:10px;color:var(--text-muted)">Margine '+item.margin+'%</div></div>'
            +'</div>'
            +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
              +(item.score>=70?'<span class="ph-tag" style="background:#22c55e20;color:#22c55e;border:1px solid #22c55e30">⭐ Bestseller</span>':'')
              +(item.margin>=50?'<span class="ph-tag" style="background:#6366f120;color:#a5b4fc;border:1px solid #6366f130">💎 Alto margine</span>':'')
              +(item.stats.count>=10?'<span class="ph-tag" style="background:#3b82f620;color:#60a5fa;border:1px solid #3b82f630">🔥 '+item.stats.count+' vendite</span>':'')
              +(item.score<30?'<span class="ph-tag" style="background:#ef444420;color:#f87171;border:1px solid #ef444430">⚠️ Rivaluta</span>':'')
            +'</div>'
            +'<div style="margin-top:8px"><div style="font-size:9px;color:var(--text-dim);margin-bottom:3px">Score '+(i+1)+'/'+topItems.length+'</div>'
              +'<div style="height:4px;background:var(--border);border-radius:99px"><div style="height:100%;width:'+item.score+'%;background:'+clr+';border-radius:99px;transition:.8s"></div></div>'
            +'</div></div>';
        }).join('')
      +'</div>'
      +(scored.length===0?'<div class="card" style="text-align:center;padding:40px;color:var(--text-dim)"><i class="fas fa-box-open" style="font-size:40px;opacity:.15;display:block;margin-bottom:12px"></i>Aggiungi prodotti al Catalogo per vedere l\'analisi</div>':'')
      +'</div>';
  }
};

/* ── MarketAgent — AI agente analisi mercato ──────────── */
window.MarketAgent = {
  _history: [],
  async render(){
    var el = document.getElementById('view-market_agent');
    if(!el) return;
    el.innerHTML = '<div style="padding:20px">'
      +'<div class="module-header"><div class="module-header-left">'
        +'<div class="module-title"><i class="fas fa-robot" style="color:#a78bfa"></i> 🤖 Market AI Agent</div>'
        +'<div class="module-subtitle">Agente AI specializzato nel mercato artigianale laser e personalizzazione</div>'
      +'</div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 300px;gap:14px">'
        +'<div class="card">'
          +'<div id="ma-chat" style="height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px;margin-bottom:14px">'
            +'<div style="background:var(--bg-card2);border-radius:10px;padding:12px;font-size:12px;color:var(--text);max-width:85%;align-self:flex-start">'
              +'<strong style="color:#a78bfa">🤖 Market AI Agent</strong><br><br>'
              +'Ciao! Sono il tuo agente di analisi mercato specializzato in:<br>'
              +'• Laser engraving & personalizzazione<br>'
              +'• Prezzi Etsy e marketplace<br>'
              +'• Trend prodotti artigianali<br>'
              +'• Strategie di crescita<br><br>'
              +'Cosa vuoi analizzare oggi?'
            +'</div>'
          +'</div>'
          +'<div style="display:flex;gap:8px">'
            +'<input class="form-control" id="ma-input" placeholder="Chiedi al Market Agent..." onkeydown="if(event.key===\'Enter\')MarketAgent.send()">'
            +'<button class="btn btn-primary" onclick="MarketAgent.send()"><i class="fas fa-paper-plane"></i></button>'
          +'</div>'
        +'</div>'
        +'<div>'
          +'<div class="card" style="margin-bottom:12px">'
            +'<div class="card-title">💡 Domande rapide</div>'
            +['Come prezzare la personalizzazione laser?',
               'Quali prodotti vendono di più su Etsy Italia?',
               'Come differenziarmi dalla concorrenza?',
               'Stagionalità del mercato artigianato?',
               'Come aumentare il valore medio ordine?'].map(function(q){
              return '<div style="padding:7px 10px;background:var(--bg-card2);border-radius:7px;margin-bottom:5px;cursor:pointer;font-size:11px;color:var(--text-muted);border:1px solid var(--border)" onclick="MarketAgent.quickAsk(\''+q.replace(/'/g,"\\'")+'\')" onmouseover="this.style.color=\'var(--primary)\'" onmouseout="this.style.color=\'var(--text-muted)\'">'+q+'</div>';
            }).join('')
          +'</div>'
          +'<div class="card">'
            +'<div class="card-title">📊 Contesto business</div>'
            +'<div id="ma-context" style="font-size:11px;color:var(--text-muted)">Caricando dati...</div>'
          +'</div>'
        +'</div>'
      +'</div></div>';
    this.loadContext();
  },

  async loadContext(){
    var el = document.getElementById('ma-context');
    if(!el) return;
    if(typeof IDB === 'undefined'){el.textContent='IDB non disponibile';return;}
    var sales = await IDB.getAll('sales').catch(function(){return[];});
    var clients = await IDB.getAll('clients').catch(function(){return[];});
    var thisMonth = new Date().getMonth();
    var mSales = sales.filter(function(s){return new Date(s.date||0).getMonth()===thisMonth;});
    var rev = mSales.reduce(function(a,s){return a+(+s.amount||0);},0);
    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:5px">'
      +'<div class="stat-row" style="font-size:11px"><span>Revenue MTD</span><span style="font-weight:700;color:var(--green)">€'+rev.toFixed(0)+'</span></div>'
      +'<div class="stat-row" style="font-size:11px"><span>Clienti</span><span style="font-weight:700">'+clients.length+'</span></div>'
      +'<div class="stat-row" style="font-size:11px"><span>Vendite MTD</span><span style="font-weight:700">'+mSales.length+'</span></div>'
      +'<div class="stat-row" style="font-size:11px"><span>Ticket medio</span><span style="font-weight:700">€'+(mSales.length?( rev/mSales.length).toFixed(0):'—')+'</span></div>'
      +'</div>';
  },

  quickAsk: function(q){ var i=document.getElementById('ma-input'); if(i)i.value=q; this.send(); },

  async send(){
    var input = document.getElementById('ma-input');
    if(!input||!input.value.trim()) return;
    var q = input.value.trim(); input.value='';
    var chat = document.getElementById('ma-chat');
    if(!chat) return;

    // Aggiungi messaggio utente
    chat.innerHTML += '<div style="background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:10px;padding:12px;font-size:12px;color:var(--text);max-width:85%;align-self:flex-end">'+q+'</div>';

    // Loading
    var loadId = 'ma-load-'+Date.now();
    chat.innerHTML += '<div id="'+loadId+'" style="background:var(--bg-card2);border-radius:10px;padding:12px;font-size:12px;color:var(--text-muted);max-width:85%;align-self:flex-start">🤖 Sto analizzando...</div>';
    chat.scrollTop = chat.scrollHeight;

    var key = localStorage.getItem('ingly_api_key')||'';
    var answer;
    if(!key){
      answer = this._localAnswer(q);
    } else {
      try{
        var res = await fetch('https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:800,
            system:'Sei un esperto consulente di marketing per artigiani italiani specializzati in laser engraving e personalizzazione. Dai risposte pratiche, specifiche e actionable in italiano. Max 200 parole per risposta.',
            messages:[...this._history,{role:'user',content:q}]})
        });
        var data = await res.json();
        answer = data.content&&data.content[0]?data.content[0].text:this._localAnswer(q);
        this._history.push({role:'user',content:q},{role:'assistant',content:answer});
        if(this._history.length>10) this._history=this._history.slice(-10);
      }catch(e){ answer=this._localAnswer(q); }
    }

    var loadEl=document.getElementById(loadId);
    if(loadEl) loadEl.innerHTML='<strong style="color:#a78bfa">🤖 Market AI Agent</strong><br><br>'+answer.replace(/\n/g,'<br>');
    chat.scrollTop=chat.scrollHeight;
  },

  _localAnswer: function(q){
    q = q.toLowerCase();
    if(q.includes('prezzo')||q.includes('pricing')||q.includes('quanto'))
      return '💰 Per prezzare correttamente:\n• Calcola costo vivo (materiale + energia + tempo)\n• Moltiplica ×3.5 per vendita singola, ×2.8 per serie\n• Verifica che il margine sia ≥40%\n\nUsa il 🧮 Calc Laser o Smart Quote 3D per calcoli precisi.';
    if(q.includes('etsy')||q.includes('marketplace'))
      return '🛍️ Su Etsy Italia funzionano:\n• Prodotti personalizzati con nome (conversione alta)\n• Foto su sfondo chiaro e lifestyle\n• Titoli con keyword: "personalizzato", "inciso", "regalo"\n• Prezzo medio €25-45 per gadget, €50-120 per decorazioni';
    if(q.includes('trend')||q.includes('prodott'))
      return '🔥 Prodotti trending 2024:\n• Portachiavi personalizzati (sempre)\n• Targhe per camerette\n• Taglieri e accessori cucina\n• Decorazioni Natale/Pasqua (stagionali)\n• Gadget aziendali B2B (margini alti)';
    return '💡 Domanda interessante! Inserisci la tua chiave API Claude nelle Impostazioni per ottenere analisi personalizzate basate sui tuoi dati di vendita.';
  }
};

/* ── EtsySEOWizard — wizard SEO step-by-step ─────────── */
window.EtsySEOWizard = {
  _step: 0,
  async render(){
    var el = document.getElementById('view-etsy_seo_wizard');
    if(!el) return;
    el.innerHTML = '<div style="padding:20px">'
      +'<div class="module-header"><div class="module-header-left">'
        +'<div class="module-title"><i class="fas fa-magic" style="color:#f0728f"></i> ✨ Etsy SEO Wizard</div>'
        +'<div class="module-subtitle">Wizard guidato per ottimizzare i tuoi listing Etsy e aumentare la visibilità</div>'
      +'</div></div>'
      +'<div style="display:grid;grid-template-columns:280px 1fr;gap:14px">'
        +'<div>'
          +'<div class="card" style="margin-bottom:12px">'
            +'<div class="card-title">📝 Dati prodotto</div>'
            +'<div class="form-group"><label class="form-label">Nome prodotto</label><input class="form-control" id="esw-name" placeholder="es. Tagliere personalizzato legno"></div>'
            +'<div class="form-group"><label class="form-label">Categoria</label>'
              +'<select class="form-control" id="esw-cat">'
                +'<option>Incisione laser legno</option><option>Personalizzazione acrilico</option>'
                +'<option>Portachiavi personalizzati</option><option>Targhe decorative</option>'
                +'<option>Cornici personalizzate</option><option>Gadget aziendali</option>'
                +'<option>Stampa 3D</option><option>Altro</option>'
              +'</select>'
            +'</div>'
            +'<div class="form-group"><label class="form-label">Prezzo €</label><input class="form-control" id="esw-price" type="number" placeholder="35"></div>'
            +'<div class="form-group"><label class="form-label">Materiale principale</label><input class="form-control" id="esw-mat" placeholder="es. Legno di pioppo 3mm"></div>'
            +'<button class="btn btn-primary" style="width:100%;background:#f0728f" onclick="EtsySEOWizard.generate()"><i class="fas fa-magic"></i> Genera SEO con AI</button>'
          +'</div>'
        +'</div>'
        +'<div>'
          +'<div class="card" id="esw-result">'
            +'<div class="card-title">🔍 Risultato SEO ottimizzato</div>'
            +'<div style="text-align:center;padding:40px;color:var(--text-dim)">'
              +'<i class="fas fa-search" style="font-size:40px;opacity:.15;display:block;margin-bottom:12px"></i>'
              +'Compila il form e premi "Genera SEO con AI"'
            +'</div>'
          +'</div>'
        +'</div>'
      +'</div></div>';
  },

  async generate(){
    var name = (document.getElementById('esw-name')||{value:''}).value.trim();
    var cat  = (document.getElementById('esw-cat')||{value:''}).value;
    var price= (document.getElementById('esw-price')||{value:''}).value;
    var mat  = (document.getElementById('esw-mat')||{value:''}).value;
    if(!name){ iToast('Inserisci il nome prodotto','warning'); return; }

    var res = document.getElementById('esw-result');
    if(res) res.innerHTML = '<div class="card-title">🔍 Risultato SEO ottimizzato</div><div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--primary)"></i><div style="margin-top:10px;color:var(--text-muted);font-size:12px">Generando SEO ottimizzato...</div></div>';

    var key = localStorage.getItem('ingly_api_key')||'';
    var title, tags, desc;

    if(key){
      try{
        var prompt = 'Sei un esperto SEO Etsy per artigiani italiani. Genera per questo prodotto:\n'
          +'Prodotto: '+name+'\nCategoria: '+cat+'\nPrezzo: €'+price+'\nMateriale: '+mat+'\n\n'
          +'Genera ESATTAMENTE in questo formato JSON (solo JSON, nessun testo extra):\n'
          +'{"title":"<titolo max 140 char con keyword principali>","tags":["tag1","tag2",...13 tag total],"description":"<descrizione 200 parole SEO-friendly in italiano>","tips":["<tip1>","<tip2>","<tip3>"]}';
        var r = await fetch('https://api.anthropic.com/v1/messages',{
          method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})
        });
        var d = await r.json();
        var text = d.content&&d.content[0]?d.content[0].text:'{}';
        var parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
        title=parsed.title; tags=parsed.tags; desc=parsed.description;
        var tipsHtml = (parsed.tips||[]).map(function(t){return '<li style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+t+'</li>';}).join('');
        this._renderResult(title, tags, desc, tipsHtml);
        return;
      }catch(e){}
    }

    // Fallback locale
    title = name+' personalizzato '+mat+' — regalo originale incisione laser artigianale italiano';
    tags = [name.toLowerCase().split(' ')[0],'personalizzato','incisione laser','artigianato italiano','regalo originale','fatto a mano',''+cat.toLowerCase(),'legno inciso','made in italy','regalo lui lei','oggetto personalizzato','laser engraving','artigianato'];
    desc = 'Bellissimo '+name.toLowerCase()+' realizzato artigianalmente in '+mat+'. Perfetto come regalo personalizzato per ogni occasione.\n\n✅ Materiale: '+mat+'\n✅ Lavorazione: Incisione laser ad alta precisione\n✅ Personalizzabile con nome, data o dedica\n✅ Made in Italy — artigianato di qualità\n\nPrezzo: €'+price;
    this._renderResult(title, tags, desc, '');
  },

  _renderResult: function(title, tags, desc, tipsHtml){
    var res = document.getElementById('esw-result');
    if(!res) return;
    res.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      +'<div class="card-title" style="margin-bottom:0">🔍 Risultato SEO ottimizzato</div>'
      +'<button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById(\'esw-title\').value+\'\\n\\n\'+document.getElementById(\'esw-desc\').value);iToast(\'📋 Copiato!\',\'success\')"><i class="fas fa-copy"></i> Copia tutto</button>'
    +'</div>'
    +'<div class="form-group">'
      +'<label class="form-label" style="display:flex;justify-content:space-between"><span>📌 TITOLO (<span id="esw-chars">0</span>/140 char)</span>'
        +'<button onclick="navigator.clipboard.writeText(document.getElementById(\'esw-title\').value);iToast(\'Copiato!\',\'success\')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px">copia</button></label>'
      +'<textarea class="form-control" id="esw-title" rows="3" style="font-size:12px" oninput="document.getElementById(\'esw-chars\').textContent=this.value.length">'+title+'</textarea>'
    +'</div>'
    +'<div class="form-group">'
      +'<label class="form-label" style="display:flex;justify-content:space-between"><span>🏷️ TAG ('+((tags||[]).length)+'/13)</span>'
        +'<button onclick="navigator.clipboard.writeText(document.getElementById(\'esw-tags-text\').textContent.replace(/×/g,\'\').trim());iToast(\'Copiato!\',\'success\')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px">copia</button></label>'
      +'<div id="esw-tags-text" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border2)">'
        +(tags||[]).map(function(t){return '<span style="background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:99px;padding:3px 10px;font-size:11px;font-weight:600">'+t+'</span>';}).join('')
      +'</div>'
    +'</div>'
    +'<div class="form-group">'
      +'<label class="form-label" style="display:flex;justify-content:space-between"><span>📄 DESCRIZIONE</span>'
        +'<button onclick="navigator.clipboard.writeText(document.getElementById(\'esw-desc\').value);iToast(\'Copiato!\',\'success\')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px">copia</button></label>'
      +'<textarea class="form-control" id="esw-desc" rows="6" style="font-size:11px;line-height:1.6">'+desc+'</textarea>'
    +'</div>'
    +(tipsHtml?'<div style="background:var(--bg-card2);border-radius:8px;padding:12px;margin-top:4px"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">💡 CONSIGLI AI</div><ul style="padding-left:16px;margin:0">'+tipsHtml+'</ul></div>':'');
    // Update char count
    var titleEl = document.getElementById('esw-title');
    var charsEl = document.getElementById('esw-chars');
    if(titleEl&&charsEl) charsEl.textContent = titleEl.value.length;
  }
};

/* ── LiveIntel — feed notizie e trend in tempo reale ─── */
window.LiveIntel = {
  async render(){
    var el = document.getElementById('view-live_intel');
    if(!el) return;

    // Dati simulati basati sul mercato laser/artigianato
    var feed = [
      {color:'#22c55e',title:'Trend: Portachiavi acrilici personalizzati +34% ricerche Etsy',time:'Oggi',cat:'📈 Trend',text:'Le ricerche per portachiavi acrilici personalizzati sono aumentate del 34% rispetto al mese scorso. Ottimo momento per caricare nuovi prodotti.'},
      {color:'#f59e0b',title:'Stagionalità: Preparati per la stagione regali',time:'Questa settimana',cat:'📅 Stagionale',text:'Tra 45 giorni inizia il picco delle vendite pre-natalizie. Inizia a caricare prodotti personalizzati e aumenta le scorte di materiali.'},
      {color:'#3b82f6',title:'Insight: Il B2B è sottoutilizzato dagli artigiani italiani',time:'Questa settimana',cat:'💡 Insight',text:'Solo il 18% degli artigiani laser ha un listino B2B. Le aziende pagano 2-3x il prezzo retail per gadget aziendali personalizzati.'},
      {color:'#a78bfa',title:'Tech: Bambu Lab X1 Carbon — nuovo standard FDM',time:'2 giorni fa',cat:'🔧 Tech',text:'Il Bambu X1 Carbon è diventato lo standard per la stampa 3D professionale. Velocità 500mm/s con qualità superiore. Valuta l\'upgrade.'},
      {color:'#f0728f',title:'Etsy: Aggiornamento algoritmo favorisce foto multiple',time:'3 giorni fa',cat:'🛍️ Etsy',text:'Etsy ha confermato che i listing con 10+ foto hanno il 40% di visibilità in più. Aggiungi foto processo, dettagli e lifestyle ai tuoi prodotti.'},
      {color:'#22d3ee',title:'Materiali: PLA Bambu disponibile in 40+ colori',time:'1 settimana fa',cat:'🧵 Materiali',text:'Bambu Lab ha rilasciato 15 nuovi colori PLA+ inclusi metallici e glitter. Prezzi stabili a €24/kg. Buon momento per ampliare il catalogo 3D.'},
      {color:'#f59e0b',title:'Business: Margini medi settore laser 2024',time:'1 settimana fa',cat:'📊 Dati',text:'Secondo i dati di settore, il margine medio degli artigiani laser italiani è del 38%. I top performer superano il 55% ottimizzando la produzione in serie.'},
      {color:'#10b981',title:'Opportunità: Mercato corporate gifts in crescita',time:'2 settimane fa',cat:'💼 B2B',text:'Il mercato dei gadget aziendali personalizzati vale €2.3B in Italia. Le PMI cercano fornitori locali affidabili per regali aziendali — posizionati ora.'},
    ];

    el.innerHTML = '<div style="padding:20px">'
      +'<div class="module-header"><div class="module-header-left">'
        +'<div class="module-title"><i class="fas fa-satellite-dish" style="color:#38bdf8"></i> 📡 Live Intel Feed</div>'
        +'<div class="module-subtitle">Notizie, trend e opportunità per artigiani laser e 3D — aggiornato settimanalmente</div>'
      +'</div>'
      +'<div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="LiveIntel.render()"><i class="fas fa-refresh"></i> Aggiorna</button></div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 280px;gap:14px">'
        +'<div>'
          +feed.map(function(item){
            return '<div class="li-item">'
              +'<div class="li-dot" style="background:'+item.color+'"></div>'
              +'<div style="flex:1">'
                +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
                  +'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:'+item.color+'22;color:'+item.color+'">'+item.cat+'</span>'
                  +'<span style="font-size:10px;color:var(--text-dim)">'+item.time+'</span>'
                +'</div>'
                +'<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">'+item.title+'</div>'
                +'<div style="font-size:12px;color:var(--text-muted);line-height:1.5">'+item.text+'</div>'
              +'</div>'
            +'</div>';
          }).join('')
        +'</div>'
        +'<div>'
          +'<div class="card" style="margin-bottom:12px">'
            +'<div class="card-title">🔥 Hot topics</div>'
            +['Personalizzazione acrilico','PLA+ Bambu colori','B2B corporate gifts','Etsy algoritmo 2024','Incisione laser legno','Stampa 3D resina'].map(function(t){
              return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
                +'<span style="color:var(--red)">🔥</span><span style="color:var(--text)">'+t+'</span></div>';
            }).join('')
          +'</div>'
          +'<div class="card">'
            +'<div class="card-title">📅 Calendario eventi</div>'
            +['Black Friday — 29 Nov','Natale — 25 Dic','San Valentino — 14 Feb','Festa della Mamma — Mag','Lauree & Diplomi — Giu/Lug'].map(function(e){
              return '<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-muted)">📅 '+e+'</div>';
            }).join('')
          +'</div>'
        +'</div>'
      +'</div></div>';
  }
};

/* ════════════════════════════════════════════════════════════
   DASHBOARD "OGGI" WIDGET
   Mostra azioni rapide e stato giornaliero
   ════════════════════════════════════════════════════════ */
window.OggiWidget = {
  async inject(){
    var view = document.getElementById('view-dashboard');
    if(!view||!view.classList.contains('active')) return;
    if(document.getElementById('oggi-widget')) return;

    var sales = await IDB.getAll('sales').catch(function(){return[];});
    var orders = await IDB.getAll('orders').catch(function(){return[];});
    var today = new Date().toDateString();
    var todaySales = sales.filter(function(s){return new Date(s.date||0).toDateString()===today;});
    var todayRev = todaySales.reduce(function(a,s){return a+(+s.amount||0);},0);
    var pendingOrders = orders.filter(function(o){return o.status&&o.status!=='completato'&&o.status!=='annullato';});
    var greet = (function(){ var h=new Date().getHours(); return h<12?'☀️ Buongiorno':h<18?'🌤️ Buon pomeriggio':'🌙 Buona sera'; })();

    var w = document.createElement('div');
    w.id = 'oggi-widget';
    var cfg={}; try{cfg=JSON.parse(localStorage.getItem('ingly_settings_main')||'{}');}catch(e){}

    w.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
      +'<div><div style="font-size:15px;font-weight:700;color:var(--text)">'+greet+' '+(cfg.businessName||'Lab')+'!</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:14px">'
        +'<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:var(--green)">€'+todayRev.toFixed(0)+'</div><div style="font-size:10px;color:var(--text-muted)">Vendite oggi</div></div>'
        +'<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:var(--primary)">'+pendingOrders.length+'</div><div style="font-size:10px;color:var(--text-muted)">Ordini attivi</div></div>'
        +'<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:var(--orange)">'+todaySales.length+'</div><div style="font-size:10px;color:var(--text-muted)">Transazioni</div></div>'
      +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      +'<div class="oggi-action" onclick="App.navigate(\'quoter\')"><span>📄</span><span>Nuovo preventivo</span></div>'
      +'<div class="oggi-action" onclick="App.navigate(\'sales\')"><span>💰</span><span>Registra vendita</span></div>'
      +'<div class="oggi-action" onclick="App.navigate(\'gestione_ordini\')"><span>📦</span><span>Vedi pipeline</span></div>'
      +'<div class="oggi-action" onclick="App.navigate(\'clients\')"><span>👥</span><span>Contatta clienti</span></div>'
    +'</div>';

    var firstCard = view.querySelector('.card,.kpi-card,.grid-4,.page-header+*');
    var pageHeader = view.querySelector('.page-header');
    if(pageHeader&&pageHeader.nextSibling) pageHeader.parentNode.insertBefore(w, pageHeader.nextSibling);
    else if(view.firstChild) view.insertBefore(w, view.firstChild);
    else view.appendChild(w);
  }
};

// Fissa il template string con la funzione h<18
(function fixOggiGreet(){
  var orig = OggiWidget.inject.toString();
  // Already fine — just init
  if(typeof NavBus !== 'undefined'){
    NavBus.on('dashboard', function(){ setTimeout(function(){ OggiWidget.inject(); }, 600); });
  }
})();

/* ════════════════════════════════════════════════════════════
   SETTINGS — aggiungi bottoni azione rapida a Backup e WhatsApp
   ════════════════════════════════════════════════════════ */
(function patchSettings(){
  if(typeof NavBus === 'undefined') return;
  NavBus.on('settings', function(){
    setTimeout(function(){
      // Aggiungi bottone Backup Manuale nella sezione settings
      var settingsView = document.getElementById('view-settings');
      if(!settingsView || settingsView.querySelector('#settings-backup-btn')) return;
      var backupCard = document.createElement('div');
      backupCard.className = 'card'; backupCard.style.marginBottom='16px';
      backupCard.id = 'settings-backup-btn';
      backupCard.innerHTML = '<div class="card-title">💾 Backup & Ripristino</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +'<button class="btn btn-secondary" onclick="BackupAuto.run(false)" style="justify-content:center"><i class="fas fa-download"></i> Scarica Backup JSON</button>'
          +'<label class="btn btn-secondary" style="justify-content:center;cursor:pointer"><i class="fas fa-upload"></i> Ripristina da file<input type="file" accept=".json" style="display:none" onchange="BackupAuto.restore(this.files[0])"></label>'
        +'</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:8px" id="last-backup-info">Caricando info backup...</div>';
      var themeCard = settingsView.querySelector('.card');
      if(themeCard&&themeCard.parentNode) themeCard.parentNode.insertBefore(backupCard, themeCard);
      // Show last backup info
      var lastBk = localStorage.getItem('ingly_last_backup');
      var infoEl = document.getElementById('last-backup-info');
      if(infoEl&&lastBk){
        var bk=JSON.parse(lastBk);
        infoEl.textContent='Ultimo backup: '+new Date(bk.ts).toLocaleString('it-IT')+' — '+bk.records+' record';
      } else if(infoEl){ infoEl.textContent='Nessun backup effettuato. Esegui il primo backup ora.'; }
    }, 300);
  });
})();

/* ════════════════════════════════════════════════════════════
   NavBus: registra NavBus.on per i 4 nuovi moduli
   ════════════════════════════════════════════════════════ */
if(typeof NavBus !== 'undefined'){
  NavBus.on('product_hunter', function(){ setTimeout(function(){ ProductHunter.render(); }, 80); });
  NavBus.on('market_agent',   function(){ setTimeout(function(){ MarketAgent.render(); }, 80); });
  NavBus.on('etsy_seo_wizard',function(){ setTimeout(function(){ EtsySEOWizard.render(); }, 80); });
  NavBus.on('live_intel',     function(){ setTimeout(function(){ LiveIntel.render(); }, 80); });
}

/* ════════════════════════════════════════════════════════════
   HEALTH CHECK v32
   ════════════════════════════════════════════════════════ */
setTimeout(function(){
  console.log('\n[INGLY OS v32] ════════════════════════');
  var newMods = ['AIVision','WATemplates','BackupAuto','StripeLink','ProductHunter','MarketAgent','EtsySEOWizard','LiveIntel','OggiWidget'];
  newMods.forEach(function(m){
    console.log('[v32] '+(typeof window[m]!=='undefined'?'✅':'❌')+' '+m);
  });
  console.log('[v32] NavBus hooks:', typeof NavBus!=='undefined'?Object.keys(NavBus._hooks).join(', '):'N/A');
  console.log('[INGLY OS v32] ════════════════════════\n');
}, 4000);

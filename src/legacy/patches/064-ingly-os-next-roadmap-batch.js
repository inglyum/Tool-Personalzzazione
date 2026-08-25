
// ════════════════════════════════════════════════════════════════════════
// INGLY OS — NEXT ROADMAP BATCH
// 1. Smart Reminders   2. AI Reply Assistant   3. Auto Hourly Rate
// 4. Quick Capture++   5. Invoice PDF Auto     6. Etsy Analytics
// 7. Live Price Compare  8. Multi-lingua preventivo
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. SMART REMINDERS — alert intelligenti con snooze
// ═══════════════════════════════════════════════════════════════════════
const SmartReminder = {
  _SK: 'ingly_reminders_v1',
  _timers: [],

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'[]'); } catch { return []; }
  },

  save(reminders) {
    localStorage.setItem(this._SK, JSON.stringify(reminders));
  },

  add(reminder) {
    const all = this.getAll();
    all.push({
      id: Date.now(),
      ...reminder,
      createdAt: new Date().toISOString(),
      snoozed: false,
    });
    this.save(all);
    this._schedule(all[all.length-1]);
    if(typeof toast !== 'undefined') toast('🔔 Reminder impostato: ' + reminder.label, 'success');
  },

  dismiss(id) {
    const all = this.getAll().filter(r => r.id !== id);
    this.save(all);
    document.getElementById('reminder-toast-'+id)?.remove();
  },

  snooze(id, minutes) {
    const all = this.getAll();
    const rem = all.find(r=>r.id===id);
    if(!rem) return;
    rem.dueAt = new Date(Date.now() + minutes*60000).toISOString();
    rem.snoozed = true;
    this.save(all);
    document.getElementById('reminder-toast-'+id)?.remove();
    this._schedule(rem);
    if(typeof toast !== 'undefined') toast(`⏰ Snooze ${minutes}m`, 'info');
  },

  _schedule(rem) {
    const diff = new Date(rem.dueAt) - Date.now();
    if(diff < 0) return;
    const tid = setTimeout(() => this._fire(rem), Math.min(diff, 2147483647));
    this._timers.push(tid);
  },

  _fire(rem) {
    // Browser notification if granted
    if(typeof PushNotifications !== 'undefined' && PushNotifications.isGranted()) {
      PushNotifications.send(rem.label, rem.body||'');
    }
    // In-app toast with snooze
    const toast_div = document.createElement('div');
    toast_div.id = 'reminder-toast-' + rem.id;
    toast_div.style.cssText = `position:fixed;bottom:${80 + document.querySelectorAll('[id^="reminder-toast-"]').length * 90}px;right:16px;
      background:var(--bg-card);border:1px solid var(--primary-border);border-left:4px solid var(--primary);
      border-radius:12px;padding:12px 14px;width:300px;z-index:99999;
      box-shadow:0 8px 32px rgba(0,0,0,.4);animation:toastIn .3s ease`;
    toast_div.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:20px;flex-shrink:0">🔔</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;color:var(--text)">${rem.label}</div>
        ${rem.body?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${rem.body}</div>`:''}
        <div style="display:flex;gap:5px;margin-top:8px">
          <button onclick="SmartReminder.snooze(${rem.id},10)" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">+10m</button>
          <button onclick="SmartReminder.snooze(${rem.id},60)" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">+1h</button>
          ${rem.section?`<button onclick="App.navigate('${rem.section}');SmartReminder.dismiss(${rem.id})" style="padding:3px 8px;background:var(--primary);color:#000;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">Vai →</button>`:''}
          <button onclick="SmartReminder.dismiss(${rem.id})" style="padding:3px 8px;background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);margin-left:auto">✕</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(toast_div);
    // Auto-remove after 30s
    setTimeout(() => toast_div.remove(), 30000);
  },

  // Check overdue orders and payments at startup
  async checkOnBoot() {
    const [orders, sales] = await Promise.all([
      IDB.getAll('orders').catch(()=>[]),
      IDB.getAll('sales').catch(()=>[]),
    ]);
    const now = new Date();

    // Orders due in < 24h
    const dueSoon = orders.filter(o => {
      if(!o.dueDate || ['venduto','annullato','completato'].includes(o.stage||o.status||'')) return false;
      const d = new Date(o.dueDate);
      const diff = (d - now) / 86400000;
      return diff >= 0 && diff <= 1;
    });

    // Overdue payments
    const overduePay = sales.filter(s =>
      s.status === 'da_pagare' && s.paymentDue && new Date(s.paymentDue) < now
    );

    // Schedule morning check reminders
    if(dueSoon.length) {
      setTimeout(() => this._fire({
        id: 'boot_orders',
        label: `⚡ ${dueSoon.length} ordin${dueSoon.length>1?'i':'e'} in scadenza entro 24h`,
        body: dueSoon.slice(0,2).map(o=>o.clientName||'—').join(', '),
        section: 'gestione_ordini',
      }), 5000);
    }
    if(overduePay.length) {
      setTimeout(() => this._fire({
        id: 'boot_payments',
        label: `💶 ${overduePay.length} pagament${overduePay.length>1?'i':'o'} scadut${overduePay.length>1?'i':'o'}`,
        body: '€'+overduePay.reduce((a,s)=>a+(+(s.amount||0)),0).toFixed(0),
        section: 'payment_schedule',
      }), 8000);
    }

    // Reschedule saved reminders
    this.getAll().forEach(r => this._schedule(r));
  },

  // Quick add reminder from order detail
  openQuickAdd(orderId, clientName, dueDate) {
    const defDate = dueDate
      ? new Date(new Date(dueDate).getTime() - 86400000).toISOString().slice(0,16)
      : new Date(Date.now() + 3600000).toISOString().slice(0,16);

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;width:min(380px,96vw);border:1px solid var(--border);box-shadow:0 20px 60px #000c;padding:18px">
      <div style="font-size:14px;font-weight:800;margin-bottom:12px">🔔 Aggiungi Reminder</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input id="rem-label" class="form-control" value="Conferma ordine ${clientName||''}" style="font-size:12px">
        <input type="datetime-local" id="rem-date" class="form-control" value="${defDate}" style="font-size:12px">
        <textarea id="rem-body" class="form-control" rows="2" placeholder="Note opzionali..." style="font-size:12px;resize:none"></textarea>
        <div style="display:flex;gap:6px">
          <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">Annulla</button>
          <button onclick="SmartReminder.add({label:document.getElementById('rem-label').value,body:document.getElementById('rem-body').value,dueAt:document.getElementById('rem-date').value,section:'gestione_ordini'});this.closest('[style*=fixed]').remove()"
            style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">💾 Salva</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  checkOnBoot() {
    const now = Date.now();
    const rems = this.getAll().filter(r => !r.dismissed && r.dueMs && r.dueMs <= now + 300000);
    rems.forEach(r => this._fire(r));
    // Schedule future reminders
    this.getAll().filter(r=>!r.dismissed&&r.dueMs&&r.dueMs>now).forEach(r=>this._schedule(r));
    // Add daily order due-date check
    this._checkOrdersDue();
  },

  async _checkOrdersDue() {
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now()+864e5).toISOString().split('T')[0];
    const ACTIVE = ['aperto','in_lavorazione','accettato','produzione','preventivo','attesa'];
    orders.forEach(o=>{
      const state = (o.stage||o.status||'').toLowerCase();
      if(!ACTIVE.includes(state)) return;
      if(o.dueDate===today||o.dueDate===tomorrow){
        const already = this.getAll().find(r=>r.fromOrderId===o.id&&r.type==='due_date');
        if(already) return;
        const label = o.dueDate===today?'⚠️ Scade OGGI':'⏰ Scade domani';
        const r = {
          id: Date.now()+Math.random(),
          label: label+': '+( o.name||'Ordine'),
          body: (o.clientName||'Cliente')+' · €'+Math.round(o.total||0),
          dueMs: Date.now()+1000,
          section: 'produzione',
          type: 'due_date',
          fromOrderId: o.id,
          dismissed: false,
        };
        this.add(r);
        this._fire(r);
      }
    });
  },

  add(rem) {
    if(!rem||!rem.label) return;
    if(!rem.id) rem.id = Date.now()+Math.random();
    const all = this.getAll();
    // Dedup
    if(rem.fromOrderId && all.find(r=>r.fromOrderId===rem.fromOrderId&&r.type===rem.type)) return;
    all.push(rem);
    this.save(all);
    if(rem.dueMs) this._schedule(rem);
  }
};
window.SmartReminder = SmartReminder;
setTimeout(()=>SmartReminder.checkOnBoot(), 4000);


// ═══════════════════════════════════════════════════════════════════════
// 2. AI REPLY ASSISTANT — risposta messaggi clienti
// ═══════════════════════════════════════════════════════════════════════
const AIReplyAssistant = {

  async open(opts) {
    opts = opts || {};
    const aiKey = (typeof ApiKeyManager !== 'undefined') ? ApiKeyManager.get('claude') : '';

    const modal = document.createElement('div');
    modal.id = 'ai-reply-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(600px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);z-index:5">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:16px">🤖</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800">AI Reply Assistant</div>
          <div style="font-size:10px;color:var(--text-muted)">Genera risposta professionale al messaggio del cliente</div>
        </div>
        <button onclick="document.getElementById('ai-reply-modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
        <!-- Messaggio ricevuto -->
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">📨 Messaggio ricevuto dal cliente</label>
          <textarea id="ar-incoming" class="form-control" rows="4" placeholder="Incolla qui il messaggio del cliente..." style="font-size:12px;resize:vertical">${opts.incoming||''}</textarea>
        </div>
        <!-- Opzioni risposta -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🗣 Tono</label>
            <select id="ar-tone" class="form-control" style="font-size:12px">
              <option value="professionale">Professionale e cordiale</option>
              <option value="amichevole">Amichevole e informale</option>
              <option value="formale">Formale (B2B)</option>
              <option value="caldo">Caldo e personale</option>
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">📋 Tipo risposta</label>
            <select id="ar-type" class="form-control" style="font-size:12px">
              <option value="generale">Risposta generale</option>
              <option value="preventivo">Richiesta preventivo</option>
              <option value="stato_ordine">Stato ordine</option>
              <option value="reclamo">Gestione reclamo</option>
              <option value="conferma">Conferma ordine</option>
              <option value="ringraziamento">Ringraziamento/recensione</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">📝 Contesto aggiuntivo (opzionale)</label>
          <input id="ar-context" class="form-control" placeholder="Es. il cliente aspetta da 5 giorni, ordine in ritardo di 2 giorni..." style="font-size:12px" value="${opts.context||''}">
        </div>
        <button id="ar-generate-btn" onclick="AIReplyAssistant._generate()"
          style="padding:11px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
          🤖 Genera risposta
        </button>
        <!-- Results -->
        <div id="ar-results" style="display:none"></div>
        <!-- No API key notice -->
        ${!aiKey?`<div style="padding:10px 14px;background:#f9731610;border-left:3px solid #f97316;border-radius:0 8px 8px 0;font-size:12px">
          ⚠️ Configura la API key Claude in <button onclick="App.navigate('settings')" style="background:none;border:none;cursor:pointer;color:var(--primary);font-weight:700;text-decoration:underline;padding:0">Impostazioni → API Key</button> per usare l'AI
        </div>`:''}
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('ar-incoming')?.focus();
  },

  async _generate() {
    const incoming = document.getElementById('ar-incoming')?.value?.trim();
    const tone     = document.getElementById('ar-tone')?.value || 'professionale';
    const type     = document.getElementById('ar-type')?.value || 'generale';
    const context  = document.getElementById('ar-context')?.value?.trim() || '';
    const resultsEl= document.getElementById('ar-results');
    const btn      = document.getElementById('ar-generate-btn');
    const aiKey    = (typeof ApiKeyManager !== 'undefined') ? ApiKeyManager.get('claude') : '';
    const cp       = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};

    if(!incoming) { if(typeof toast!=='undefined') toast('Incolla prima il messaggio del cliente','warning'); return; }
    if(!aiKey)    { if(typeof toast!=='undefined') toast('API key Claude non configurata','error'); return; }

    if(btn) { btn.disabled=true; btn.textContent='⏳ Generazione...'; }

    const toneDesc = {
      'professionale':'professionale, cordiale e rassicurante',
      'amichevole':'amichevole, informale, usa emoji con moderazione',
      'formale':'formale, business, nessuna emoji',
      'caldo':'caldo, personale, empatico',
    }[tone];

    const typeDesc = {
      'preventivo': 'Il cliente chiede informazioni per un preventivo. Invitalo a fornire dettagli (misure, materiale, quantità) e specifica tempi di risposta.',
      'stato_ordine': 'Il cliente chiede lo stato del suo ordine. Sii preciso sui tempi.',
      'reclamo': 'Il cliente non è soddisfatto. Sii empatico, scusati, offri soluzione concreta.',
      'conferma': 'Conferma la presa in carico dell\'ordine con dettagli.',
      'ringraziamento': 'Ringrazia per la recensione/feedback positivo, invita a tornare.',
      'generale': 'Risposta generale al messaggio.',
    }[type];

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':aiKey, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Sei ${cp.name||'un artigiano'} che risponde a un cliente.
Tono: ${toneDesc}.
Tipo: ${typeDesc}
${context ? 'Contesto: ' + context : ''}

Messaggio del cliente:
"${incoming}"

Genera UNA risposta diretta in italiano, pronta da inviare. Max 150 parole. No prefissi tipo "Ecco la risposta:" — inizia direttamente la risposta.`
          }]
        })
      });
      if(!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      const reply = data.content?.[0]?.text || '';

      // Show results
      if(resultsEl) {
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = `
        <div style="border-top:1px solid var(--border);padding-top:12px">
          <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✅ Risposta generata</div>
          <div style="position:relative">
            <textarea id="ar-reply" class="form-control" rows="6" style="font-size:12px;line-height:1.6;resize:vertical;padding-right:80px">${reply}</textarea>
            <div style="position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:5px">
              <button onclick="navigator.clipboard.writeText(document.getElementById('ar-reply').value).then(()=>toast('✅ Copiato!','success'))"
                style="padding:4px 8px;background:var(--primary);color:#000;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">📋 Copia</button>
              <button onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('ar-reply').value),'_blank')"
                style="padding:4px 8px;background:#25D36620;border:1px solid #25D36640;border-radius:5px;cursor:pointer;font-size:10px;color:#25D366">💬 WA</button>
            </div>
          </div>
          <button onclick="AIReplyAssistant._generate()" style="width:100%;padding:7px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted);margin-top:6px">
            ↺ Genera variante
          </button>
        </div>`;
      }
    } catch(e) {
      if(typeof toast!=='undefined') toast('❌ Errore: '+e.message,'error');
    } finally {
      if(btn) { btn.disabled=false; btn.textContent='🤖 Genera risposta'; }
    }
  },
};
window.AIReplyAssistant = AIReplyAssistant;


// ═══════════════════════════════════════════════════════════════════════
// 3. AUTO HOURLY RATE — costo orario calcolato dai timer
// ═══════════════════════════════════════════════════════════════════════
const AutoHourlyRate = {
  _SK: 'ingly_hourly_rate_v1',

  get() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'{"rate":25,"currency":"EUR"}'); }
    catch { return {rate:25,currency:'EUR'}; }
  },

  set(rate) {
    localStorage.setItem(this._SK, JSON.stringify({rate, currency:'EUR', updatedAt:new Date().toISOString()}));
  },

  // Calculate effective hourly rate from completed orders with timers
  async calculate() {
    const allOrders = await IDB.getAll('orders').catch(()=>[]);
    const completed = allOrders.filter(o => ['completato','venduto'].includes(o.stage||o.status||''));
    let totalRevenue = 0, totalSeconds = 0, samplesUsed = 0;

    completed.forEach(o => {
      const revenue = +(o.total||o.value||0);
      const timerData = (typeof ProductionTimer !== 'undefined') ? ProductionTimer.getAll()[String(o.id)] : null;
      const secs = timerData ? timerData.total : 0;
      if(revenue > 0 && secs > 600) { // Min 10 minutes
        totalRevenue += revenue;
        totalSeconds += secs;
        samplesUsed++;
      }
    });

    if(samplesUsed < 3) return null; // Not enough data

    const effectiveRate = (totalRevenue / (totalSeconds / 3600));
    return {
      rate: Math.round(effectiveRate * 100) / 100,
      samplesUsed,
      totalHours: (totalSeconds / 3600).toFixed(1),
      totalRevenue: totalRevenue.toFixed(2),
    };
  },

  // Show in Settings
  renderPanel() {
    const el = document.getElementById('hourly-rate-panel');
    if(!el) return;
    const current = this.get();
    el.innerHTML = `
    <div style="padding:12px 0;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1">
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">💶 Tariffa oraria (€/h)</label>
          <div style="display:flex;gap:6px">
            <input id="ahr-input" type="number" class="form-control" value="${current.rate}" min="1" max="999" style="font-size:14px;font-weight:800;width:100px">
            <button onclick="AutoHourlyRate.set(parseFloat(document.getElementById('ahr-input').value||25));toast('✅ Tariffa salvata','success')"
              style="padding:0 14px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Salva</button>
            <button onclick="AutoHourlyRate._calcAndShow()"
              style="padding:0 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)" title="Calcola dai tuoi dati reali">🔄 Calcola auto</button>
          </div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">Usata per calcolare il costo del tuo tempo negli ordini con timer attivi</div>
    </div>`;
  },

  async _calcAndShow() {
    const result = await this.calculate();
    if(!result) {
      if(typeof toast !== 'undefined') toast('Servono almeno 3 ordini completati con timer per il calcolo automatico','info');
      return;
    }
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;width:min(360px,96vw);border:1px solid var(--border);box-shadow:0 20px 60px #000c;padding:20px">
      <div style="font-size:16px;font-weight:900;margin-bottom:12px">📊 Tariffa effettiva calcolata</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="padding:12px;background:var(--primary-dim);border-radius:10px;text-align:center">
          <div style="font-size:26px;font-weight:900;color:var(--primary)">€${result.rate}/h</div>
          <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Tariffa effettiva</div>
        </div>
        <div style="padding:12px;background:var(--bg-card2);border-radius:10px;text-align:center">
          <div style="font-size:20px;font-weight:900">${result.samplesUsed}</div>
          <div style="font-size:9px;color:var(--text-muted)">Ordini analizzati</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">
        ${result.totalHours}h lavorate · €${result.totalRevenue} incassati
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">Annulla</button>
        <button onclick="AutoHourlyRate.set(${result.rate});toast('✅ Tariffa aggiornata a €${result.rate}/h','success');this.closest('[style*=fixed]').remove()"
          style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Applica €${result.rate}/h</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },
};
window.AutoHourlyRate = AutoHourlyRate;


// ═══════════════════════════════════════════════════════════════════════
// 4. INVOICE/RICEVUTA PDF AUTO — genera PDF da vendita
// ═══════════════════════════════════════════════════════════════════════
const AutoInvoicePDF = {

  async generate(saleId) {
    const sale = await IDB.get('sales', +saleId||saleId).catch(()=>null);
    if(!sale) { if(typeof toast!=='undefined') toast('Vendita non trovata','error'); return; }
    if(typeof window.jspdf==='undefined') { if(typeof toast!=='undefined') toast('jsPDF non disponibile','error'); return; }

    const cp     = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
    const client = (await IDB.getAll('clients').catch(()=>[])).find(c=>c.name===sale.clientName);
    const { jsPDF } = window.jspdf;
    const doc    = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
    const amount = +(sale.amount||0);
    const iva    = sale.withIVA ? amount*0.22 : 0;
    const total  = amount + iva;
    const docNum = `RIC-${new Date(sale.date||Date.now()).getFullYear()}-${String(saleId).slice(-5).padStart(5,'0')}`;
    const dateStr= new Date(sale.date||Date.now()).toLocaleDateString('it-IT');

    // === Layout A4 ===
    // Header bar
    doc.setFillColor(15,23,42); doc.rect(0,0,210,32,'F');
    doc.setFillColor(99,102,241); doc.rect(0,30,210,3,'F');

    // Logo / Company name
    doc.setTextColor(255,255,255);
    doc.setFontSize(18); doc.setFont(undefined,'bold');
    doc.text(cp.name||'La Tua Azienda', 14, 16);
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text([
      cp.piva ? `P.IVA: ${cp.piva}` : '',
      cp.address || '',
      `${cp.email||''} ${cp.phone?'· '+cp.phone:''}`,
    ].filter(Boolean).join('  ·  '), 14, 23);

    // Doc number top right
    doc.setFontSize(10); doc.setFont(undefined,'bold');
    doc.text(docNum, 196, 14, {align:'right'});
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text(dateStr, 196, 21, {align:'right'});

    // Title
    doc.setTextColor(15,23,42);
    doc.setFontSize(22); doc.setFont(undefined,'bold');
    doc.text(sale.withIVA ? 'FATTURA' : 'RICEVUTA', 14, 48);
    doc.setFontSize(10); doc.setFont(undefined,'normal');
    doc.setTextColor(100,116,139);
    doc.text(sale.withIVA ? 'Con addebito IVA 22%' : 'Senza applicazione IVA — regime forfettario', 14, 55);

    // Client box
    doc.setFillColor(248,250,252); doc.roundedRect(14,60,85,30,2,2,'F');
    doc.setDrawColor(226,232,240); doc.roundedRect(14,60,85,30,2,2,'D');
    doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont(undefined,'bold');
    doc.text('CLIENTE', 18,68);
    doc.setTextColor(15,23,42); doc.setFontSize(11); doc.setFont(undefined,'bold');
    doc.text(sale.clientName||'—', 18, 76);
    doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(100,116,139);
    if(client?.email) doc.text(client.email, 18, 82);
    if(client?.address) doc.text(client.address, 18, 87);

    // Payment box
    doc.setFillColor(240,253,244); doc.roundedRect(111,60,85,30,2,2,'F');
    doc.setDrawColor(187,247,208); doc.roundedRect(111,60,85,30,2,2,'D');
    doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont(undefined,'bold');
    doc.text('PAGAMENTO', 115,68);
    doc.setTextColor(22,163,74); doc.setFontSize(11); doc.setFont(undefined,'bold');
    doc.text(sale.status==='pagato'?'✓ PAGATO':'DA PAGARE', 115,76);
    doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(100,116,139);
    if(sale.paidAt) doc.text('Data: '+new Date(sale.paidAt).toLocaleDateString('it-IT'), 115,82);
    if(cp.iban) doc.text('IBAN: '+cp.iban.slice(0,26), 115,87);

    // Table header
    const tableY = 97;
    doc.setFillColor(15,23,42); doc.rect(14,tableY,182,8,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont(undefined,'bold');
    doc.text('DESCRIZIONE', 18, tableY+5.5);
    doc.text('CANALE', 140, tableY+5.5);
    doc.text('IMPORTO', 192, tableY+5.5, {align:'right'});

    // Table row
    doc.setFillColor(248,250,252); doc.rect(14,tableY+8,182,14,'F');
    doc.setTextColor(15,23,42); doc.setFontSize(10); doc.setFont(undefined,'normal');
    doc.text(sale.desc||sale.description||'Servizio artigianale', 18, tableY+17);
    doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text(sale.channel||'Diretto', 140, tableY+17);
    doc.setTextColor(15,23,42); doc.setFont(undefined,'bold');
    doc.text('€'+amount.toFixed(2), 192, tableY+17, {align:'right'});

    // Totals
    let totY = tableY + 30;
    doc.setDrawColor(226,232,240);
    const addTotalRow = (label, val, bold, color) => {
      if(bold) { doc.setFont(undefined,'bold'); doc.setFillColor(240,240,255); doc.rect(14,totY-5,182,9,'F'); }
      else doc.setFont(undefined,'normal');
      doc.setTextColor(color||'#1e293b');
      doc.setFontSize(10);
      doc.text(label, 18, totY);
      doc.text('€'+val, 192, totY, {align:'right'});
      totY += 9;
    };
    if(iva > 0) {
      addTotalRow('Imponibile', amount.toFixed(2), false);
      addTotalRow('IVA 22%', iva.toFixed(2), false);
    }
    doc.setFillColor(99,102,241); doc.rect(14,totY-5,182,11,'F');
    doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(13);
    doc.text('TOTALE', 18, totY+1);
    doc.text('€'+total.toFixed(2), 192, totY+1, {align:'right'});

    // Notes
    if(sale.notes) {
      totY += 20;
      doc.setFillColor(255,251,235); doc.roundedRect(14,totY,182,15,2,2,'F');
      doc.setTextColor(146,64,14); doc.setFont(undefined,'normal'); doc.setFontSize(8);
      doc.text('Note: '+sale.notes, 18, totY+9, {maxWidth:174});
    }

    // Footer
    doc.setFillColor(15,23,42); doc.rect(0,275,210,22,'F');
    doc.setTextColor(148,163,184); doc.setFontSize(7); doc.setFont(undefined,'normal');
    doc.text([
      cp.name||'', cp.piva?'P.IVA: '+cp.piva:'', cp.address||'', `${cp.email||''} ${cp.phone||''}`,
    ].filter(Boolean).join('  ·  '), 105, 284, {align:'center'});
    doc.text('Documento generato con INGLY OS', 105, 289, {align:'center'});

    const fname = `${sale.withIVA?'Fattura':'Ricevuta'}-${docNum}-${(sale.clientName||'cliente').replace(/[^a-zA-Z0-9]/g,'-')}.pdf`;
    doc.save(fname);
    if(typeof toast!=='undefined') toast(`📄 ${sale.withIVA?'Fattura':'Ricevuta'} scaricata!`, 'success');
  },
};
window.AutoInvoicePDF = AutoInvoicePDF;


// ═══════════════════════════════════════════════════════════════════════
// 5. ETSY ANALYTICS — statistiche avanzate
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// 🛍️ ETSY ANALYTICS PRO v12 — Metriche reali dalle vendite
// ═══════════════════════════════════════════════════════════════════════
const EtsyAnalytics = {

  async render() {
    const el = document.getElementById('view-etsy_analytics') || document.getElementById('view-etsyai');
    if(!el) return;

    const [sales, orders, catalog] = await Promise.all([
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('orders').catch(()=>[]),
      IDB.getAll('catalog').catch(()=>[]),
    ]);

    const etsySales = sales.filter(s => (s.channel||'').toLowerCase().includes('etsy') || (s.channel||'').toLowerCase().includes('shop'));
    const allSales  = sales.filter(s => s.status === 'pagato');
    const etsyPaid  = etsySales.filter(s => s.status === 'pagato');
    const now = new Date();

    // ── Monthly revenue (12 months) ──────────────────────────────────
    const months = [];
    for(let i=11;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('it-IT',{month:'short',year:'2-digit'});
      const mSales = etsyPaid.filter(s=>(s.date||'').startsWith(key));
      const mAll   = allSales.filter(s=>(s.date||'').startsWith(key));
      months.push({key,label,rev:mSales.reduce((a,s)=>a+(+s.amount||0),0),cnt:mSales.length,allRev:mAll.reduce((a,s)=>a+(+s.amount||0),0)});
    }

    // ── Top products (from catalog linked to Etsy sales) ─────────────
    const prodMap = {};
    etsyPaid.forEach(s=>{
      const key = s.desc || s.catalogProductId || 'Altro';
      if(!prodMap[key]) prodMap[key]={name:key,revenue:0,count:0};
      prodMap[key].revenue += (+s.amount||0);
      prodMap[key].count++;
    });
    const topProds = Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,8);

    // ── KPIs ──────────────────────────────────────────────────────────
    const totalRev  = etsyPaid.reduce((a,s)=>a+(+s.amount||0),0);
    const totalAll  = allSales.reduce((a,s)=>a+(+s.amount||0),0);
    const etsyShare = totalAll>0?Math.round(totalRev/totalAll*100):0;
    const avgOrder  = etsyPaid.length>0?Math.round(totalRev/etsyPaid.length):0;
    const thisMonth = months[months.length-1];
    const lastMonth = months[months.length-2];
    const mTrend    = lastMonth.rev>0?Math.round((thisMonth.rev-lastMonth.rev)/lastMonth.rev*100):0;
    const ETSY_FEE  = 0.065; // 6.5% transaction fee
    const feesEst   = Math.round(totalRev * ETSY_FEE);

    // ── Bar chart heights ──────────────────────────────────────────────
    const maxRev = Math.max(...months.map(m=>m.rev),1);
    const barH = m => Math.round(m.rev/maxRev*80);

    el.innerHTML = `
    <div style="padding:0 0 20px;max-width:1100px;margin:0 auto">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px">
        <div>
          <h1 style="font-size:20px;font-weight:900;margin:0;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🛍️</div>
            Etsy Analytics
          </h1>
          <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0 46px">Metriche calcolate dalle vendite con canale "Etsy"</p>
        </div>
        <div style="display:flex;gap:7px">
          <button onclick="Sales.openModal()" style="padding:7px 14px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">+ Nuova Vendita Etsy</button>
        </div>
      </div>

      <!-- KPI STRIP -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px">
        ${[
          {l:'Revenue Etsy',v:'€'+Math.round(totalRev),sub:etsyShare+'% del totale',c:'#f97316',ico:'🛍️'},
          {l:'Vendite Etsy',v:etsyPaid.length,sub:'ordini pagati',c:'#22c55e',ico:'✅'},
          {l:'Ordine Medio',v:'€'+avgOrder,sub:'per transazione',c:'#818cf8',ico:'📦'},
          {l:'Questo Mese',v:'€'+Math.round(thisMonth.rev),sub:(mTrend>=0?'↑+':'↓')+Math.abs(mTrend)+'% vs mese sc.',c:mTrend>=0?'#22c55e':'#ef4444',ico:'📅'},
          {l:'Fee stimate',v:'~€'+feesEst,sub:'6.5% transazione Etsy',c:'#f59e0b',ico:'💳'},
          {l:'Top prodotto',v:topProds[0]?.name?.slice(0,14)||'—',sub:'€'+Math.round(topProds[0]?.revenue||0),c:'#f97316',ico:'⭐'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:13px 14px;display:flex;align-items:center;gap:10px">
          <div style="font-size:20px;flex-shrink:0">${k.ico}</div>
          <div style="min-width:0">
            <div style="font-size:16px;font-weight:900;color:${k.c};line-height:1.1">${k.v}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.l}</div>
            <div style="font-size:9px;color:var(--text-dim)">${k.sub}</div>
          </div>
        </div>`).join('')}
      </div>

      <!-- CHART + TOP PRODUCTS -->
      <div style="display:grid;grid-template-columns:1fr 360px;gap:14px;margin-bottom:18px">

        <!-- Revenue Chart -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px">
          <div style="font-size:13px;font-weight:800;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
            <span>📊 Revenue mensile Etsy (12 mesi)</span>
            <span style="font-size:11px;color:var(--text-muted)">€${Math.round(totalRev)} totale</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:5px;height:100px">
            ${months.map((m,i)=>{
              const h = barH(m);
              const isCurrentMonth = i===months.length-1;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div title="${m.label}: €${Math.round(m.rev)}" style="width:100%;background:${isCurrentMonth?'#f97316':'#f9731650'};border-radius:4px 4px 0 0;height:${Math.max(h,2)}px;transition:height .4s;cursor:pointer" onmouseover="this.title='${m.label}: €${Math.round(m.rev)}'"></div>
                <div style="font-size:8px;color:var(--text-dim);text-align:center;writing-mode:vertical-rl;transform:rotate(180deg);height:28px;overflow:hidden">${m.label}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:16px;margin-top:12px;font-size:10px;color:var(--text-muted)">
            <div>📦 Media mensile: <strong>€${months.length?Math.round(totalRev/months.length):0}</strong></div>
            <div>🏆 Miglior mese: <strong>${months.reduce((a,m)=>m.rev>a.rev?m:a,months[0])?.label||'—'}</strong></div>
          </div>
        </div>

        <!-- Top Products -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px">
          <div style="font-size:13px;font-weight:800;margin-bottom:12px">⭐ Top Prodotti Etsy</div>
          ${topProds.length ? `<div style="display:flex;flex-direction:column;gap:7px">
            ${topProds.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px">
              <div style="width:20px;height:20px;border-radius:5px;background:${i<3?'#f97316':'var(--bg-card2)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${i<3?'#fff':'var(--text-dim)'};flex-shrink:0">${i+1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
                <div style="font-size:9px;color:var(--text-muted)">${p.count} vendite</div>
              </div>
              <div style="font-size:12px;font-weight:800;color:#f97316;flex-shrink:0">€${Math.round(p.revenue)}</div>
            </div>`).join('')}
          </div>` : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Nessuna vendita Etsy registrata.<br>Aggiungi vendite con canale "Etsy".</div>`}
        </div>
      </div>

      <!-- MONTHLY TABLE -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:18px">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:800">📋 Tabella mensile dettagliata</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:var(--bg-card2)">
                <th style="padding:9px 14px;text-align:left;color:var(--text-muted);font-weight:600">Mese</th>
                <th style="padding:9px 14px;text-align:right;color:var(--text-muted);font-weight:600">Revenue Etsy</th>
                <th style="padding:9px 14px;text-align:right;color:var(--text-muted);font-weight:600">N° Vendite</th>
                <th style="padding:9px 14px;text-align:right;color:var(--text-muted);font-weight:600">Media ordine</th>
                <th style="padding:9px 14px;text-align:right;color:var(--text-muted);font-weight:600">Fee stimate</th>
                <th style="padding:9px 14px;text-align:right;color:var(--text-muted);font-weight:600">Netto stimato</th>
              </tr>
            </thead>
            <tbody>
              ${months.slice().reverse().map((m,i)=>`<tr style="border-top:1px solid var(--border);${i===0?'background:var(--bg-card2);font-weight:700':''}">
                <td style="padding:8px 14px;color:var(--text)">${m.label}${i===0?' 📍':''}</td>
                <td style="padding:8px 14px;text-align:right;color:#f97316;font-weight:700">${m.rev>0?'€'+Math.round(m.rev):'—'}</td>
                <td style="padding:8px 14px;text-align:right">${m.cnt||'—'}</td>
                <td style="padding:8px 14px;text-align:right;color:var(--text-muted)">${m.cnt>0?'€'+Math.round(m.rev/m.cnt):'—'}</td>
                <td style="padding:8px 14px;text-align:right;color:#f59e0b">~€${m.rev>0?Math.round(m.rev*ETSY_FEE):'0'}</td>
                <td style="padding:8px 14px;text-align:right;color:#22c55e;font-weight:700">${m.rev>0?'€'+Math.round(m.rev*(1-ETSY_FEE)):'—'}</td>
              </tr>`).join('')}
              <tr style="background:var(--bg-card2);border-top:2px solid var(--border);font-weight:800">
                <td style="padding:9px 14px">TOTALE</td>
                <td style="padding:9px 14px;text-align:right;color:#f97316">€${Math.round(totalRev)}</td>
                <td style="padding:9px 14px;text-align:right">${etsyPaid.length}</td>
                <td style="padding:9px 14px;text-align:right;color:var(--text-muted)">€${avgOrder}</td>
                <td style="padding:9px 14px;text-align:right;color:#f59e0b">~€${feesEst}</td>
                <td style="padding:9px 14px;text-align:right;color:#22c55e">€${Math.round(totalRev*(1-ETSY_FEE))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEASONAL CALENDAR (reused) -->
      <div id="etsy-seasonal-section"></div>
    </div>`;

    // Inject seasonal calendar
    const seasonal = document.getElementById('etsy-seasonal-section');
    if(seasonal){
      // Already implemented via AutoEngine seasonal checks
      seasonal.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px 16px">
        <div style="font-size:13px;font-weight:800;margin-bottom:10px">🌿 Prossime Opportunità Stagionali</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[{ico:'💝',d:'14 Feb',n:'San Valentino'},{ico:'💐',d:'12 Mag',n:'Festa Mamma'},{ico:'🎓',d:'Giu',n:'Lauree'},{ico:'🛍️',d:'Nov',n:'Black Friday'},{ico:'🎄',d:'Dic',n:'Natale'}].map(ev=>`
          <div style="background:var(--bg-card2);border-radius:10px;padding:10px 13px;border:1px solid var(--border);display:flex;align-items:center;gap:8px;flex:1;min-width:140px">
            <span style="font-size:22px">${ev.ico}</span>
            <div><div style="font-size:12px;font-weight:700">${ev.n}</div><div style="font-size:10px;color:var(--text-muted)">${ev.d}</div></div>
          </div>`).join('')}
        </div>
      </div>`;
    }
  }
};
window.EtsyAnalytics = EtsyAnalytics;


// ═══════════════════════════════════════════════════════════════════════
// 6. INSTALL — wires + patches
// ═══════════════════════════════════════════════════════════════════════
(function installNextBatch(){
  const tryInstall = () => {
    if(typeof App==='undefined') return setTimeout(tryInstall, 800);

    // Add views
    const addView = (id, afterId) => {
      if(document.getElementById('view-'+id)) return;
      const div = document.createElement('div');
      div.className='section-view'; div.id='view-'+id;
      const after = document.getElementById('view-'+afterId);
      if(after) after.parentNode.insertBefore(div, after.nextSibling);
    };
    addView('etsy_analytics','etsyai');

    // Add nav items
    const addNav = (id, label, icon, afterSection, color) => {
      if(document.querySelector(`[data-section="${id}"]`)) return;
      const after = document.querySelector(`[data-section="${afterSection}"]`);
      if(!after) return;
      const nav = document.createElement('div');
      nav.className='nav-item';
      nav.setAttribute('data-section',id);
      nav.onclick=()=>App.navigate(id);
      nav.innerHTML=`<i class="fas ${icon}" style="color:${color};font-size:10px"></i> ${label}`;
      after.parentNode.insertBefore(nav, after.nextSibling);
    };
    addNav('etsy_analytics','📊 Etsy Analytics','fa-chart-pie','etsyai','#f97316');

    // Patch renderSection
    if(!App.__nextBatchPatch) {
      App.__nextBatchPatch = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) App.renderSection = function(s) {
        if(s==='etsy_analytics') { EtsyAnalytics.render(); return; }
        _origRS(s);
      };
    }

    // Inject invoice button in Sales
    setTimeout(()=>{
      if(document.getElementById('auto-invoice-btn')) return;
      // Add to sales table rows via event delegation
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-invoice-sale-id]');
        if(btn) AutoInvoicePDF.generate(btn.dataset.invoiceSaleId);
      });
    }, 2000);

    // Inject AI Reply button in QuickCapture / toolbar
    setTimeout(()=>{
      if(document.getElementById('ai-reply-topbar-btn')) return;
      const topbar = document.getElementById('topbar') || document.querySelector('.topbar');
      if(!topbar) return;
      const btn = document.createElement('button');
      btn.id='ai-reply-topbar-btn';
      btn.style.cssText='padding:5px 9px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);border-radius:7px;cursor:pointer;font-size:10px;color:#8b5cf6;font-weight:700;white-space:nowrap';
      btn.innerHTML='🤖 Reply';
      btn.title='AI Reply Assistant — genera risposta a messaggi clienti';
      btn.onclick=()=>AIReplyAssistant.open();
      topbar.appendChild(btn);
    }, 3500);

    // Inject SmartReminder button in order modal
    const patchOrderModal = () => {
      if(typeof GestioneOrdini==='undefined') return setTimeout(patchOrderModal, 800);
      if(GestioneOrdini.__reminderPatch) return;
      GestioneOrdini.__reminderPatch = true;
      const _orig = GestioneOrdini._openDetail.bind(GestioneOrdini);
      GestioneOrdini._openDetail = async function(id) {
        await _orig(id);
        setTimeout(()=>{
          const modal = document.getElementById('go-detail-modal');
          if(!modal) return;
          const btnRow = modal.querySelector('[style*="border-top:1px solid"] div');
          if(btnRow && !btnRow.querySelector('.reminder-btn')) {
            const o = IDB.get('orders',+id||id).catch(()=>null);
            const remBtn = document.createElement('button');
            remBtn.className='reminder-btn';
            remBtn.style.cssText='padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)';
            remBtn.innerHTML='🔔';
            remBtn.title='Aggiungi reminder per questo ordine';
            remBtn.onclick = async () => {
              const order = await IDB.get('orders',+id||id).catch(()=>null);
              SmartReminder.openQuickAdd(id, order?.clientName, order?.dueDate);
            };
            btnRow.appendChild(remBtn);
          }
        }, 250);
      };
    };
    patchOrderModal();

    // Inject AutoHourlyRate + invoice in Settings
    setTimeout(()=>{
      if(document.getElementById('hourly-rate-panel')) return;
      const existing = document.getElementById('company-profile-panel');
      if(!existing) return;
      const parent = existing.closest('[style*="padding:0 20px"]') || existing.parentElement;
      if(!parent) return;

      const section = document.createElement('div');
      section.style.cssText='background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden';
      section.innerHTML=`
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer"
        onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:16px">💶</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">Tariffa Oraria</div>
          <div style="font-size:11px;color:var(--text-muted)">Costo orario · calcolato dai timer produzione</div></div>
        <span style="color:var(--text-muted)">▼</span>
      </div>
      <div id="hourly-rate-panel" style="padding:0 16px;display:none"></div>`;
      parent.insertBefore(section, parent.firstChild);
      AutoHourlyRate.renderPanel();
    }, 5000);

    console.log('[NextBatch] SmartReminder + AIReplyAssistant + AutoHourlyRate + AutoInvoicePDF + EtsyAnalytics installed ✅');
  };
  setTimeout(tryInstall, 2300);
})();

console.log('[INGLY OS] Next roadmap batch loaded ✅');



// ════════════════════════════════════════════════════════════════════════
// INGLY OS — BRAND IDENTITY MODULE
// Storia · Visione & Mission · Identità Visiva · Tono di Voce
// ════════════════════════════════════════════════════════════════════════
const BrandIdentity = {
  _SK: 'ingly_brand_v1',

  DEFAULTS: {
    storia_titolo:    'La Nostra Storia',
    storia_sottotitolo: 'Come tutto è iniziato',
    storia_testo: `L'ho costruito da zero. Non da una situazione ideale — tutt'altro.

Un vecchio edificio siciliano, in serio stato di degrado. Muri screpolati, pavimenti rotti, un vento freddo che passava da ogni fessura. Ma ci siamo presentati lo stesso, con i nostri attrezzi, e abbiamo iniziato a lavorare.

Perché quando credi davvero in una visione, non aspetti le condizioni perfette. Inizi con quello che hai.

Mentre il business cresce, è arrivato il momento di dare a questo spazio la cura che merita. Il budget è limitato, così siamo diventati la nostra squadra edile. Il nostro equilibrio vita-lavoro? Giornate lunghe, corse scolastiche e sessioni serali seguite da corse in laboratorio — sì, lavoriamo anche nel fine settimana.

Mio marito prende i suoi strumenti; io prendo i miei. Se mi conosci, è un vero colpo di scena: sono sempre stata la "principessa passeggera" di famiglia. Non avrei mai immaginato di ristrutturare uno spazio o imparare a usare strumenti industriali. Ma è un'abilità nuovissima che sto imparando — e che grande gioia impararla da mio marito.

Stiamo ricostruendo questo spazio da soli, mattone dopo mattone, muro dopo muro. È complicato, è estenuante, è un lavoro in corso.

Ma ad ogni crepa che ripariamo e ad ogni muro che rafforziamo, ricordiamo qualcosa di importante:

Le fondamenta più solide non sono quelle che si comprano. Sono quelle che si costruiscono insieme, con le proprie mani.`,

    mission: 'Portare la bellezza dell\'artigianato laser nelle case delle persone, con prodotti personalizzati che raccontano storie vere. Ogni incisione è un gesto di cura, ogni oggetto è unico come chi lo riceve.',
    vision:  'Un mondo in cui l\'artigianato tecnologico e il lavoro manuale si fondono per creare oggetti con anima — sostenibili, locali, fatti con intenzione e rispetto per le persone e il pianeta.',
    valori:  ['Autenticità — ogni prodotto racconta una storia vera',
              'Sostenibilità — materiali naturali, zero sprechi, packaging eco',
              'Cura artigianale — lento, preciso, fatto con amore',
              'Trasparenza — mostriamo il processo, non solo il prodotto',
              'Comunità — cresciamo insieme ai nostri clienti'],

    // Identità visiva
    colore_primario:   '#6366f1',
    colore_secondario: '#10b981',
    colore_accent:     '#f97316',
    colore_sfondo:     '#0f172a',
    font_principale:   'Nunito, system-ui, sans-serif',
    font_titoli:       'Georgia, serif',
    logo_desc:         'Logo circolare con laser e onde — simbolo di precisione e calore artigianale',
    mood_board:        ['Legno naturale · texture organiche', 'Verde salvia · terra di Siena', 'Minimalismo con calore', 'Fotografie in luce naturale'],

    // Tono di voce
    tono_titolo:       'Come parliamo',
    tono_parole: ['autentico', 'caldo', 'diretto', 'artigianale', 'umano', 'positivo'],
    tono_non_parole: ['lusso', 'esclusivo', 'premium', 'sconto', 'promo', 'offerta lampo'],
    tono_desc: `Parliamo come parleremmo a un amico che ci chiede del nostro lavoro. Sinceri, entusiasti, senza pretese. Usiamo la prima persona, raccontiamo il dietro le quinte, ammettiamo quando le cose sono difficili.

Non ci nascondiamo dietro un brand asettico — siamo persone reali che fanno cose reali, in uno spazio reale che stiamo costruendo con le nostre mani.

Il nostro tono è eco-friendly anche nel linguaggio: niente parole vuote, niente promesse esagerate. Solo lavoro vero, materiali onesti, storie vere.`,

    eco_titolo:   'Il nostro impegno green',
    eco_punti: ['MDF certificato FSC — legno da foreste gestite responsabilmente',
                'Zero plastica nel packaging — solo carta, cartone, spago di iuta',
                'Scarti laser riutilizzati per campioni e prove',
                'Laboratorio a km0 — produciamo e consegnamo localmente',
                'Energia da fonti rinnovabili nel laboratorio'],
  },

  get() {
    try { return { ...this.DEFAULTS, ...JSON.parse(localStorage.getItem(this._SK) || '{}') }; }
    catch { return { ...this.DEFAULTS }; }
  },

  save(data) {
    const current = this.get();
    const merged  = { ...current, ...data };
    localStorage.setItem(this._SK, JSON.stringify(merged));
    if (typeof toast !== 'undefined') toast('✅ Salvato!', 'success');
  },

  async render() {
    const el = document.getElementById('view-brand_identity');
    if (!el) return;
    const b = this.get();

    el.innerHTML = `
    <div style="padding:0 0 40px;max-width:1000px;margin:0 auto">

      <!-- ══ HEADER ══ -->
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px 32px 24px;position:sticky;top:0;z-index:10;margin-bottom:0">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🎨</div>
          <div style="flex:1">
            <h1 style="margin:0 0 3px;font-size:20px;font-weight:900;color:#fff">Brand Identity</h1>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,.6)">Storia · Visione · Identità Visiva · Tono di Voce — tutto modificabile</p>
          </div>
          <button onclick="BrandIdentity.saveAll()"
            style="padding:9px 18px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;white-space:nowrap">
            💾 Salva tutto
          </button>
        </div>

        <!-- Tab navigation -->
        <div style="display:flex;gap:4px;margin-top:20px;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:0">
          ${[['storia','📖 Storia'],['visione','🔭 Visione & Mission'],['identita','🎨 Identità'],['tono','🗣️ Tono di Voce'],['eco','🌿 Eco & Valori']].map(([id,label])=>`
          <button onclick="BrandIdentity.showTab('${id}')" id="bi-tab-${id}"
            style="padding:8px 14px;background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:12px;font-weight:700;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s"
            onmouseover="if(!this.classList.contains('active'))this.style.color='rgba(255,255,255,.9)'"
            onmouseout="if(!this.classList.contains('active'))this.style.color='rgba(255,255,255,.6)'">
            ${label}
          </button>`).join('')}
        </div>
      </div>

      <!-- ══ TAB: STORIA ══ -->
      <div id="bi-panel-storia" class="bi-panel" style="padding:28px 32px;display:block">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          ${this._field('bi-storia-titolo', '📖 Titolo sezione', b.storia_titolo, 'text')}
          ${this._field('bi-storia-sottotitolo', '✨ Sottotitolo', b.storia_sottotitolo, 'text')}
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">📝 La tua storia — modifica liberamente</label>
          <textarea id="bi-storia-testo" rows="18" class="form-control"
            style="font-size:13px;line-height:1.75;resize:vertical;white-space:pre-wrap">${b.storia_testo}</textarea>
        </div>

        <!-- Preview carta -->
        <div style="margin-top:20px;background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);padding:24px;position:relative">
          <div style="position:absolute;top:12px;right:12px;font-size:10px;color:var(--text-dim)">Preview</div>
          <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px" id="bi-prev-titolo">${b.storia_titolo}</div>
          <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:12px" id="bi-prev-sotto">${b.storia_sottotitolo}</div>
          <div style="font-size:13px;color:var(--text-muted);line-height:1.8;white-space:pre-wrap;max-height:200px;overflow:auto" id="bi-prev-testo">${b.storia_testo}</div>
        </div>
        <script>
          document.getElementById('bi-storia-titolo').addEventListener('input',e=>document.getElementById('bi-prev-titolo').textContent=e.target.value);
          document.getElementById('bi-storia-sottotitolo').addEventListener('input',e=>document.getElementById('bi-prev-sotto').textContent=e.target.value);
          document.getElementById('bi-storia-testo').addEventListener('input',e=>document.getElementById('bi-prev-testo').textContent=e.target.value);
        <\/script>
      </div>

      <!-- ══ TAB: VISIONE & MISSION ══ -->
      <div id="bi-panel-visione" class="bi-panel" style="padding:28px 32px;display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🔭 Visione — dove stiamo andando</label>
            <textarea id="bi-vision" rows="6" class="form-control" style="font-size:13px;line-height:1.6;resize:vertical">${b.vision}</textarea>
            <div style="font-size:10px;color:var(--text-dim);margin-top:4px">La visione è il "perché" più grande — dove vuoi che il mondo arrivi grazie a ciò che fai</div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🎯 Mission — cosa facciamo ogni giorno</label>
            <textarea id="bi-mission" rows="6" class="form-control" style="font-size:13px;line-height:1.6;resize:vertical">${b.mission}</textarea>
            <div style="font-size:10px;color:var(--text-dim);margin-top:4px">La mission è il "come" — l'impatto concreto che vuoi avere sui tuoi clienti</div>
          </div>
        </div>

        <!-- Valori -->
        <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:10px">💎 I tuoi valori fondamentali</label>
        <div id="bi-valori-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
          ${(b.valori||[]).map((v,i)=>`
          <div style="display:flex;gap:6px;align-items:center">
            <span style="color:var(--primary);font-size:14px">◆</span>
            <input type="text" value="${v}" class="form-control" style="font-size:12px;flex:1" data-valori-idx="${i}">
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;padding:0 6px">✕</button>
          </div>`).join('')}
        </div>
        <button onclick="BrandIdentity._addValore()"
          style="padding:6px 12px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:7px;cursor:pointer;font-size:12px;color:var(--text-muted)">
          + Aggiungi valore
        </button>

        <!-- Vision card preview -->
        <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;padding:20px;color:#fff">
            <div style="font-size:10px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🔭 La nostra visione</div>
            <div style="font-size:14px;line-height:1.6;opacity:.9" id="bi-vision-preview">${b.vision}</div>
          </div>
          <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;padding:20px;color:#fff">
            <div style="font-size:10px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🎯 La nostra missione</div>
            <div style="font-size:14px;line-height:1.6;opacity:.9" id="bi-mission-preview">${b.mission}</div>
          </div>
        </div>
        <script>
          document.getElementById('bi-vision').addEventListener('input',e=>document.getElementById('bi-vision-preview').textContent=e.target.value);
          document.getElementById('bi-mission').addEventListener('input',e=>document.getElementById('bi-mission-preview').textContent=e.target.value);
        <\/script>
      </div>

      <!-- ══ TAB: IDENTITÀ VISIVA ══ -->
      <div id="bi-panel-identita" class="bi-panel" style="padding:28px 32px;display:none">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🎨 Colore primario</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="color" id="bi-col-primary" value="${b.colore_primario}" style="width:38px;height:32px;border:none;border-radius:6px;cursor:pointer"
                oninput="document.getElementById('bi-col-primary-hex').value=this.value;document.getElementById('bi-swatch-primary').style.background=this.value">
              <input id="bi-col-primary-hex" class="form-control" value="${b.colore_primario}" style="font-size:12px;flex:1"
                oninput="document.getElementById('bi-col-primary').value=this.value;document.getElementById('bi-swatch-primary').style.background=this.value">
            </div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🌿 Colore secondario</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="color" id="bi-col-secondary" value="${b.colore_secondario}" style="width:38px;height:32px;border:none;border-radius:6px;cursor:pointer"
                oninput="document.getElementById('bi-col-secondary-hex').value=this.value;document.getElementById('bi-swatch-secondary').style.background=this.value">
              <input id="bi-col-secondary-hex" class="form-control" value="${b.colore_secondario}" style="font-size:12px;flex:1"
                oninput="document.getElementById('bi-col-secondary').value=this.value;document.getElementById('bi-swatch-secondary').style.background=this.value">
            </div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🔥 Colore accent</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="color" id="bi-col-accent" value="${b.colore_accent}" style="width:38px;height:32px;border:none;border-radius:6px;cursor:pointer"
                oninput="document.getElementById('bi-col-accent-hex').value=this.value;document.getElementById('bi-swatch-accent').style.background=this.value">
              <input id="bi-col-accent-hex" class="form-control" value="${b.colore_accent}" style="font-size:12px;flex:1"
                oninput="document.getElementById('bi-col-accent').value=this.value;document.getElementById('bi-swatch-accent').style.background=this.value">
            </div>
          </div>
        </div>

        <!-- Palette preview -->
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <div id="bi-swatch-primary" style="flex:1;height:50px;border-radius:10px;background:${b.colore_primario};display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700">Primario</div>
          <div id="bi-swatch-secondary" style="flex:1;height:50px;border-radius:10px;background:${b.colore_secondario};display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700">Secondario</div>
          <div id="bi-swatch-accent" style="flex:1;height:50px;border-radius:10px;background:${b.colore_accent};display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700">Accent</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">📝 Font principale (testo)</label>
            <input id="bi-font-main" class="form-control" value="${b.font_principale}" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🏷️ Font titoli</label>
            <input id="bi-font-titoli" class="form-control" value="${b.font_titoli}" style="font-size:12px">
          </div>
        </div>

        <div style="margin-bottom:16px">
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🖼 Descrizione logo</label>
          <input id="bi-logo-desc" class="form-control" value="${b.logo_desc}" style="font-size:12px">
        </div>

        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">🎭 Mood Board — parole chiave visive</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px" id="bi-mood-tags">
            ${(b.mood_board||[]).map((m,i)=>`
            <div style="display:flex;align-items:center;gap:3px;padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:99px">
              <input type="text" value="${m}" class="form-control" style="border:none;background:transparent;font-size:12px;padding:0;min-width:120px;max-width:180px;height:auto">
              <button onclick="this.closest('div').remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:0 2px">✕</button>
            </div>`).join('')}
            <button onclick="BrandIdentity._addMoodTag()"
              style="padding:5px 10px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:99px;cursor:pointer;font-size:12px;color:var(--text-muted)">+ Tag</button>
          </div>
        </div>
      </div>

      <!-- ══ TAB: TONO DI VOCE ══ -->
      <div id="bi-panel-tono" class="bi-panel" style="padding:28px 32px;display:none">
        <div style="margin-bottom:20px">
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🗣️ Come parlate — descrizione del tono</label>
          <textarea id="bi-tono-desc" rows="7" class="form-control" style="font-size:13px;line-height:1.7;resize:vertical">${b.tono_desc}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <div>
            <label style="font-size:10px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">✅ Parole che USI</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:50px;padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)" id="bi-parole-si">
              ${(b.tono_parole||[]).map(p=>`
              <div style="display:flex;align-items:center;gap:3px;padding:4px 10px;background:#22c55e18;border:1px solid #22c55e30;border-radius:99px">
                <input type="text" value="${p}" style="border:none;background:transparent;font-size:12px;padding:0;color:#22c55e;min-width:60px;max-width:110px;height:auto">
                <button onclick="this.closest('div').remove()" style="background:none;border:none;color:#22c55e;cursor:pointer;font-size:11px;padding:0 2px">✕</button>
              </div>`).join('')}
              <button onclick="BrandIdentity._addParola('si')"
                style="padding:4px 10px;background:none;border:1px dashed #22c55e40;border-radius:99px;cursor:pointer;font-size:11px;color:#22c55e">+ parola</button>
            </div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">❌ Parole che EVITI</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:50px;padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)" id="bi-parole-no">
              ${(b.tono_non_parole||[]).map(p=>`
              <div style="display:flex;align-items:center;gap:3px;padding:4px 10px;background:#ef444418;border:1px solid #ef444430;border-radius:99px">
                <input type="text" value="${p}" style="border:none;background:transparent;font-size:12px;padding:0;color:#ef4444;min-width:60px;max-width:110px;height:auto">
                <button onclick="this.closest('div').remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:0 2px">✕</button>
              </div>`).join('')}
              <button onclick="BrandIdentity._addParola('no')"
                style="padding:4px 10px;background:none;border:1px dashed #ef444440;border-radius:99px;cursor:pointer;font-size:11px;color:#ef4444">+ parola</button>
            </div>
          </div>
        </div>

        <!-- Esempi tono -->
        <div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">💬 Esempi di tono corretto</div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:10px;font-size:13px">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <span style="color:#ef4444;font-weight:700;white-space:nowrap">❌</span>
              <span style="color:var(--text-muted);text-decoration:line-through">"Prodotto di lusso esclusivo con finiture premium"</span>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-start">
              <span style="color:#22c55e;font-weight:700;white-space:nowrap">✅</span>
              <span style="color:var(--text)">"L'ho fatto con le mie mani, in legno di betulla. Ci ho messo 2 ore. Vale ogni minuto."</span>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-start">
              <span style="color:#ef4444;font-weight:700;white-space:nowrap">❌</span>
              <span style="color:var(--text-muted);text-decoration:line-through">"Offerta limitata — sconto 30% solo oggi!"</span>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-start">
              <span style="color:#22c55e;font-weight:700;white-space:nowrap">✅</span>
              <span style="color:var(--text)">"Questo mese ho solo 5 posti disponibili per personalizzazioni. Se ci sei, scrivimi."</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ TAB: ECO & VALORI ══ -->
      <div id="bi-panel-eco" class="bi-panel" style="padding:28px 32px;display:none">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:16px;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;color:#fff">
          <span style="font-size:32px">🌿</span>
          <div>
            <div style="font-size:16px;font-weight:800">Impegno Green & Sostenibilità</div>
            <div style="font-size:12px;opacity:.8;margin-top:2px">Ogni scelta ha un impatto — documenta il tuo</div>
          </div>
        </div>

        <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">♻️ I tuoi impegni eco</label>
        <div id="bi-eco-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
          ${(b.eco_punti||[]).map((p,i)=>`
          <div style="display:flex;gap:8px;align-items:center;padding:8px 12px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);border-left:3px solid #22c55e">
            <span style="font-size:16px">🌱</span>
            <input type="text" value="${p}" class="form-control" style="font-size:12px;flex:1;border:none;background:transparent;padding:0;height:auto">
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0 4px">✕</button>
          </div>`).join('')}
        </div>
        <button onclick="BrandIdentity._addEco()"
          style="padding:7px 14px;background:var(--bg-card2);border:1px dashed #22c55e50;border-radius:8px;cursor:pointer;font-size:12px;color:#22c55e;font-weight:700">
          🌱 Aggiungi impegno
        </button>

        <!-- Eco certificate card preview -->
        <div style="margin-top:24px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #22c55e30;border-radius:14px;padding:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:36px;height:36px;background:#22c55e;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px">🌿</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:#14532d">Il nostro impegno green</div>
              <div style="font-size:11px;color:#16a34a">Artigianato responsabile · Fatto con cura</div>
            </div>
          </div>
          <div id="bi-eco-preview" style="display:flex;flex-direction:column;gap:6px">
            ${(b.eco_punti||[]).map(p=>`<div style="display:flex;gap:7px;font-size:13px;color:#15803d"><span>✓</span><span>${p}</span></div>`).join('')}
          </div>
        </div>
      </div>

    </div>`;

    // Activate first tab
    this.showTab('storia');
  },

  showTab(id) {
    document.querySelectorAll('.bi-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('[id^="bi-tab-"]').forEach(t => {
      t.style.borderBottomColor = 'transparent';
      t.style.color = 'rgba(255,255,255,.6)';
    });
    const panel = document.getElementById('bi-panel-'+id);
    if (panel) panel.style.display = 'block';
    const tab = document.getElementById('bi-tab-'+id);
    if (tab) { tab.style.borderBottomColor = '#818cf8'; tab.style.color = '#fff'; }
  },

  _field(id, label, value, type) {
    return `<div>
      <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">${label}</label>
      <input id="${id}" type="${type}" class="form-control" value="${(value||'').replace(/"/g,'&quot;')}" style="font-size:12px">
    </div>`;
  },

  _addValore() {
    const list = document.getElementById('bi-valori-list');
    if (!list) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:6px;align-items:center';
    div.innerHTML = `<span style="color:var(--primary);font-size:14px">◆</span>
      <input type="text" value="Nuovo valore..." class="form-control" style="font-size:12px;flex:1">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;padding:0 6px">✕</button>`;
    list.appendChild(div);
    div.querySelector('input').focus();
    div.querySelector('input').select();
  },

  _addParola(type) {
    const container = document.getElementById('btn-parole-' + type) || document.getElementById('bi-parole-' + type);
    if (!container) return;
    const col = type === 'si' ? '#22c55e' : '#ef4444';
    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:3px;padding:4px 10px;background:${col}18;border:1px solid ${col}30;border-radius:99px`;
    div.innerHTML = `<input type="text" value="nuova..." style="border:none;background:transparent;font-size:12px;padding:0;color:${col};min-width:60px;max-width:110px;height:auto">
      <button onclick="this.closest('div').remove()" style="background:none;border:none;color:${col};cursor:pointer;font-size:11px;padding:0 2px">✕</button>`;
    const addBtn = container.querySelector('button:last-child');
    if (addBtn) container.insertBefore(div, addBtn);
    else container.appendChild(div);
    div.querySelector('input').focus();
    div.querySelector('input').select();
  },

  _addMoodTag() {
    const container = document.getElementById('bi-mood-tags');
    if (!container) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:3px;padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:99px';
    div.innerHTML = `<input type="text" value="nuovo tag" class="form-control" style="border:none;background:transparent;font-size:12px;padding:0;min-width:80px;max-width:160px;height:auto">
      <button onclick="this.closest('div').remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:0 2px">✕</button>`;
    const addBtn = container.querySelector('button:last-child');
    if (addBtn) container.insertBefore(div, addBtn);
    else container.appendChild(div);
    div.querySelector('input').focus();
    div.querySelector('input').select();
  },

  _addEco() {
    const list = document.getElementById('bi-eco-list');
    if (!list) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 12px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);border-left:3px solid #22c55e';
    div.innerHTML = `<span style="font-size:16px">🌱</span>
      <input type="text" value="Nuovo impegno eco..." class="form-control" style="font-size:12px;flex:1;border:none;background:transparent;padding:0;height:auto">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0 4px">✕</button>`;
    list.appendChild(div);
    div.querySelector('input').focus();
    div.querySelector('input').select();
  },

  saveAll() {
    const v = id => document.getElementById(id)?.value || '';
    const getListInputs = id => [...document.querySelectorAll(`#${id} input[type=text]`)].map(i=>i.value.trim()).filter(Boolean);

    this.save({
      storia_titolo:    v('bi-storia-titolo'),
      storia_sottotitolo: v('bi-storia-sottotitolo'),
      storia_testo:     v('bi-storia-testo'),
      mission:          v('bi-mission'),
      vision:           v('bi-vision'),
      valori:           getListInputs('bi-valori-list'),
      colore_primario:  v('bi-col-primary') || v('bi-col-primary-hex'),
      colore_secondario:v('bi-col-secondary') || v('bi-col-secondary-hex'),
      colore_accent:    v('bi-col-accent') || v('bi-col-accent-hex'),
      font_principale:  v('bi-font-main'),
      font_titoli:      v('bi-font-titoli'),
      logo_desc:        v('bi-logo-desc'),
      mood_board:       getListInputs('bi-mood-tags'),
      tono_desc:        v('bi-tono-desc'),
      tono_parole:      getListInputs('bi-parole-si'),
      tono_non_parole:  getListInputs('bi-parole-no'),
      eco_punti:        getListInputs('bi-eco-list'),
    });
  },
};
window.BrandIdentity = BrandIdentity;

// ── INSTALL: view + nav + renderSection ──────────────────────────────
(function installBrandIdentity(){
  const tryInstall = () => {
    if (typeof App === 'undefined') return setTimeout(tryInstall, 800);

    // view container
    if (!document.getElementById('view-brand_identity')) {
      const container = document.querySelector('.section-view') || document.body;
      const div = document.createElement('div');
      div.className = 'section-view'; div.id = 'view-brand_identity';
      container.parentNode?.appendChild(div) || document.body.appendChild(div);
    }

    // nav item — mettilo in fondo alla sidebar o dopo Settings
    if (!document.querySelector('[data-section="brand_identity"]')) {
      const settingsNav = document.querySelector('[data-section="settings"]');
      if (settingsNav) {
        const nav = document.createElement('div');
        nav.className = 'nav-item';
        nav.setAttribute('data-section', 'brand_identity');
        nav.onclick = () => App.navigate('brand_identity');
        nav.innerHTML = '<i class="fas fa-palette" style="color:#8b5cf6;font-size:11px"></i> <span style="color:var(--text-muted);font-size:11px">Brand & Identità</span>';
        settingsNav.parentNode.insertBefore(nav, settingsNav.nextSibling);
      }
    }

    // renderSection
    if (!App.__brandPatch) {
      App.__brandPatch = true;
      const _origRS = App.renderSection?.bind(App);
      if (_origRS) App.renderSection = function(s) {
        if (s === 'brand_identity') { BrandIdentity.render(); return; }
        _origRS(s);
      };
    }

    console.log('[BrandIdentity] Installed ✅');
  };
  setTimeout(tryInstall, 2000);
})();


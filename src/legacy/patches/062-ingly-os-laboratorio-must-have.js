
// ════════════════════════════════════════════════════════════════════════
// INGLY OS — LABORATORIO MUST HAVE
// Database prodotti essenziali per artigiani laser — editabile, con link
// ════════════════════════════════════════════════════════════════════════
const LabMustHave = {
  _SK: 'ingly_lab_musthave_v1',
  _filter: 'all',
  _search: '',
  _modal: null,

  CATS: [
    { id:'all',       label:'Tutti i Prodotti',         icon:'📦', color:'#6366f1' },
    { id:'colla',     label:'Colla & Assemblaggio',     icon:'🧪', color:'#8b5cf6' },
    { id:'finitura',  label:'Verniciatura & Finitura',  icon:'🎨', color:'#ec4899' },
    { id:'sublim',    label:'Sublimazione',              icon:'🔥', color:'#f97316' },
    { id:'video',     label:'Video ASMR & Studio',      icon:'🎬', color:'#0ea5e9' },
    { id:'sicurezza', label:'Sicurezza & Ordine',        icon:'🛡️', color:'#10b981' },
    { id:'laser',     label:'Laser & Materiali',         icon:'⚡', color:'#fbbf24' },
    { id:'misura',    label:'Misura & Precisione',       icon:'📏', color:'#64748b' },
  ],

  // PRIORITÀ: 1=Essenziale, 2=Importante, 3=Nice to have
  DEFAULT_ITEMS: [
    // ── COLLA & ASSEMBLAGGIO ─────────────────────────────────────────
    { id:1,  cat:'colla',    p:1, name:'Colla Cianoacrilica + Attivatore',
      brand:'Mitreapel o Akfix 705',
      desc:'Lo standard dei falegnami. Incolla in 3 secondi netti. Con attivatore spray acceleri ancora. Funziona su legno, plexiglass, gomma, metallo.',
      supplier:'Amazon / Bricoman', price_range:'€15–25', link:'https://www.amazon.it/s?k=colla+cianoacrilica+attivatore',
      img:'', notes:'Tieni il set presa rapida + presa flessibile', starred:true },
    { id:2,  cat:'colla',    p:1, name:'Colla Vinilica per Legno',
      brand:'Titebond III Ultimate',
      desc:'Presa fortissima, resistente all\'acqua. Superiore alla Vinavil per export. Essenziale per tagli e incastri su legno massiccio.',
      supplier:'Amazon / Utensilerie Online', price_range:'€18–30', link:'https://www.amazon.it/s?k=titebond+III',
      img:'', notes:'La III (verde) è waterproof — usa sempre quella', starred:true },
    { id:3,  cat:'colla',    p:2, name:'Colla per Plexiglass',
      brand:'Acrifix 192',
      desc:'"Salda" il plexi con luce UV senza lasciare aloni bianchi. Crea giunzioni invisibili e resistenti.',
      supplier:'Amazon / Negozi Plexy', price_range:'€12–20', link:'https://www.amazon.it/s?k=acrifix+192',
      img:'', notes:'Applica con siringa sottile per precisione', starred:false },
    { id:4,  cat:'colla',    p:1, name:'Alcol Isopropilico 99.9%',
      brand:'Vevor / EQM (Tanica 5L)',
      desc:'Pulisce residui di fumo laser e colla senza lasciare tracce. Indispensabile dopo ogni lavorazione su plexiglass e mirror.',
      supplier:'Amazon / eBay', price_range:'€20–35 (5L)', link:'https://www.amazon.it/s?k=alcol+isopropilico+99',
      img:'', notes:'Compra da 5L, costa molto meno. Non usare il 70%!', starred:true },
    { id:5,  cat:'colla',    p:1, name:'Application Tape (Mascheratura)',
      brand:'R-Tape / Poli-Tape',
      desc:'Rotoli larghi 30/60cm. Fondamentale per non bruciare il legno chiaro. Protegge la superficie e facilita il weed del vinile.',
      supplier:'CPL Fabbrika / Necchishop', price_range:'€15–25/rotolo', link:'https://www.necchishop.com',
      img:'', notes:'Larghezza 60cm copre MDF standard senza giunzioni', starred:true },
    { id:6,  cat:'colla',    p:2, name:'Spray per Gomma (Contatto)',
      brand:'UHU Contact / Bostik',
      desc:'Per incollare gomma EVA, feltro, tessuto su supporti laser. Essenziale per basi antigraffio su taglieri e oggetti da tavolo.',
      supplier:'Amazon / Ferramenta', price_range:'€12–18', link:'https://www.amazon.it/s?k=colla+contatto+spray',
      img:'', notes:'Usa in spazio ventilato o con respiratore', starred:false },

    // ── VERNICIATURA & FINITURA ──────────────────────────────────────
    { id:10, cat:'finitura',  p:1, name:'Vernice Spray Opaca',
      brand:'Montana Colors MTN 94',
      desc:'Bassa pressione, controllo totale, finish opaco professionale. 600 colori, zero run, asciuga rapida. La preferita da creativi e artigiani.',
      supplier:'Graffitishop.it / Amazon', price_range:'€6–9/bomboletta', link:'https://www.graffitishop.it',
      img:'', notes:'MTN 94 = bassa pressione. MTN Colors = alta pressione. Non confondere!', starred:true },
    { id:11, cat:'finitura',  p:1, name:'Cera Finitura Legno',
      brand:'Borma Wachs o Osmo Polyx',
      desc:'Nutre il legno e lo rende setoso al tatto (effetto lusso). Amplifica la venatura, protegge dall\'umidità senza sigillare come una vernice.',
      supplier:'Amazon / Ferramenta', price_range:'€25–45/lt', link:'https://www.amazon.it/s?k=osmo+polyx+olio',
      img:'', notes:'Una mano leggera con panno in microfibra. Asciuga in 24h', starred:true },
    { id:12, cat:'finitura',  p:2, name:'Bitume di Giudea',
      brand:'Maimeri o Ferrario',
      desc:'Crea l\'effetto "antico" e profondo nelle incisioni laser. Penetra nel legno, poi si rimuove in eccesso per esaltare solo le incisioni.',
      supplier:'Belle Arti / Amazon', price_range:'€8–15', link:'https://www.amazon.it/s?k=bitume+di+giudea',
      img:'', notes:'Mescola con acquaragia per diluire. Effetto wow garantito', starred:false },
    { id:13, cat:'finitura',  p:1, name:'Primer Spray',
      brand:'Maston o MTN Primer',
      desc:'Fondo necessario se usi MDF prima del colore. Chiude i pori, migliora l\'adesione, evita bolle e scrostamenti.',
      supplier:'Graffitishop / Amazon', price_range:'€5–8', link:'https://www.amazon.it/s?k=primer+spray+legno+mdf',
      img:'', notes:'MDF assorbe tutto senza primer. Minimo 2 mani sottili', starred:true },
    { id:14, cat:'finitura',  p:2, name:'Vernice Acrilica Lucida (Top Coat)',
      brand:'Montana Varnish / Rust-Oleum',
      desc:'Sigilla e protegge il lavoro finito. Versione lucida per effetto vetro, opaca per effetto professionale. Resistente ai graffi.',
      supplier:'Amazon / Graffitishop', price_range:'€8–14', link:'https://www.amazon.it/s?k=top+coat+spray+legno',
      img:'', notes:'Applica solo quando il colore è completamente asciutto (48h)', starred:false },
    { id:15, cat:'finitura',  p:3, name:'Olio di Lino Cotto',
      brand:'Resineco o Ferrario',
      desc:'Protegge il legno naturale dall\'interno. Perfetto per taglieri alimentari — non tossico, esalta la venatura.',
      supplier:'Ferramenta / Amazon', price_range:'€8–15/lt', link:'https://www.amazon.it/s?k=olio+di+lino+cotto+legno',
      img:'', notes:'Solo su legno non verniciato e non cerato. Rinnovabile annualmente', starred:false },

    // ── SUBLIMAZIONE ─────────────────────────────────────────────────
    { id:20, cat:'sublim',    p:1, name:'Carta Sublimatica',
      brand:'A-SUB (A4 e A3)',
      desc:'La n.1 al mondo per rilascio inchiostro su superfici dure. Rilascio oltre 95%, colori vividi, nessuna sbavatura.',
      supplier:'Amazon', price_range:'€20–35/100fg', link:'https://www.amazon.it/s?k=A-SUB+carta+sublimatica',
      img:'', notes:'Stampa lato opaco. Conserva in sacchetto chiuso lontano dall\'umidità', starred:true },
    { id:21, cat:'sublim',    p:1, name:'Spray Coating per Legno',
      brand:'Digi-Coat / SubliStar',
      desc:'Rende il legno "sublimabile" se non compri lastre pronte. 3 mani, asciugatura tra ogni mano. Risultato quasi identico alle lastre.',
      supplier:'Plotterfilms / Amazon', price_range:'€25–40/bomboletta', link:'https://www.plotterfilms.it',
      img:'', notes:'Applica in ambienti ventilati. Strato uniforme = sublimazione uniforme', starred:true },
    { id:22, cat:'sublim',    p:1, name:'Nastro Kapton Tape',
      brand:'Kapton (generico Amazon)',
      desc:'Nastro che non scioglie a 200°C nella pressa. Tiene i pezzi fermi durante la sublimazione senza rilasciare adhesivo.',
      supplier:'Amazon', price_range:'€5–12', link:'https://www.amazon.it/s?k=kapton+tape+nastro+termico',
      img:'', notes:'Larghezza 25mm è la più versatile. Comprarne almeno 5 rotoli', starred:true },
    { id:23, cat:'sublim',    p:2, name:'Carta Transfer Termica',
      brand:'Siser EasySubli / Chemica',
      desc:'Per sublimazione su tessuto scuro o bianco. Si trasferisce con press a 180°C. Elastica e lavabile.',
      supplier:'Amazon / Specializzati', price_range:'€30–60/foglio A3', link:'https://www.amazon.it/s?k=siser+easysubli',
      img:'', notes:'Funziona solo su poliestere o cotone trattato. Test su swatch prima', starred:false },
    { id:24, cat:'sublim',    p:2, name:'Feltro Siliconato per Pressa',
      brand:'Generico (spessore 3mm)',
      desc:'Va sul piano della pressa termica per distribuire la pressione uniformemente. Evita segni sui bordi dei pezzi.',
      supplier:'Amazon / Presse Termiche', price_range:'€15–25', link:'https://www.amazon.it/s?k=feltro+siliconato+pressa+termica',
      img:'', notes:'Taglia su misura del piano. Sostituisci ogni 6 mesi', starred:false },

    // ── VIDEO ASMR & STUDIO ──────────────────────────────────────────
    { id:30, cat:'video',     p:1, name:'Braccio Overhead "Giraffa"',
      brand:'Neewer C-Stand o Impact',
      desc:'Stabile, non trema. Essenziale per riprese dall\'alto del tavolo (flat lay). Regge anche fotocamere pesanti senza vibrazioni.',
      supplier:'Amazon', price_range:'€80–150', link:'https://www.amazon.it/s?k=neewer+c-stand+braccio+overhead',
      img:'', notes:'Piomba il peso con sacchetti di sabbia. Non fidarsi dei modelli leggeri', starred:true },
    { id:31, cat:'video',     p:1, name:'Piatto Rotante 360°',
      brand:'ComXim o Orangemonkie Foldio',
      desc:'Per presentare i prodotti in modo professionale. Motorizzato a velocità regolabile. Video di prodotto con una sola ripresa.',
      supplier:'Amazon', price_range:'€25–80', link:'https://www.amazon.it/s?k=piatto+rotante+360+fotografia',
      img:'', notes:'Il Foldio360 ha il background incluso. Ottimo per Etsy', starred:true },
    { id:32, cat:'video',     p:1, name:'Luci Softbox LED Bi-Color',
      brand:'Godox SL60W o Neewer 660',
      desc:'Illuminazione Bi-Color 3200K–5600K per video senza ombre dure. Dimmerabile. Lo standard per studio home a basso budget.',
      supplier:'Amazon', price_range:'€80–200 (kit 2)', link:'https://www.amazon.it/s?k=godox+softbox+led+kit',
      img:'', notes:'2 luci = key light + fill light. Angolo 45° fronte + 45° lato opposto', starred:true },
    { id:33, cat:'video',     p:2, name:'Ring Light + Treppiede',
      brand:'Neewer 18" o Elgato Ring Light',
      desc:'Per video faccia-a-video o tutorial. Crea il classico riflesso circolare negli occhi. Con staffa per smartphone e telecomando.',
      supplier:'Amazon', price_range:'€40–120', link:'https://www.amazon.it/s?k=ring+light+18+treppiede',
      img:'', notes:'La 18" è la misura giusta per studi piccoli. Non prendere le 10"', starred:false },
    { id:34, cat:'video',     p:2, name:'Microfono USB da Tavolo',
      brand:'Blue Yeti o Rode NT-USB',
      desc:'Il suono conta quanto l\'immagine. Cardioide per registrare solo davanti al microfono. USB plug-and-play, nessun mixer.',
      supplier:'Amazon', price_range:'€80–150', link:'https://www.amazon.it/s?k=blue+yeti+microfono',
      img:'', notes:'Rode NT-USB Mini è il miglior compromesso qualità/prezzo', starred:false },
    { id:35, cat:'video',     p:3, name:'Cavo Diffuser (Foam)',
      brand:'Promaster o DIY',
      desc:'Sfera bianca o pannello foam per diffondere luce LED in modo ultra-soffice. Elimina le ombre nette su superfici riflettenti.',
      supplier:'Amazon / Fai da te', price_range:'€5–20', link:'https://www.amazon.it/s?k=diffuser+foam+softbox',
      img:'', notes:'Una sfera ping-pong su un LED = diffusore ASMR perfetto', starred:false },
    { id:36, cat:'video',     p:2, name:'Pannello LED Slim (Background)',
      brand:'Elgato Key Light Air o Govee',
      desc:'Per creare background colorati e professionali senza green screen. Controllabile da app o voce.',
      supplier:'Amazon', price_range:'€50–150', link:'https://www.amazon.it/s?k=elgato+key+light',
      img:'', notes:'Due pannelli ai lati del monitor = studio look professionale', starred:false },

    // ── SICUREZZA & ORDINE ───────────────────────────────────────────
    { id:40, cat:'sicurezza', p:1, name:'Maschera Respiratoria Semi-facciale',
      brand:'3M Serie 6000 + Filtri A2P3',
      desc:'Filtri A2P3 per fumi laser e vapori vernici. La serie 6000 è il gold standard per laboratori. Riutilizzabile con cartucce sostituibili.',
      supplier:'Amazon / Antinfortunistica', price_range:'€30–50 + filtri €15', link:'https://www.amazon.it/s?k=3M+6200+maschera+respiratoria',
      img:'', notes:'Filtri A2P3 = organici + particolato fine. Sostituisci ogni 40h di utilizzo', starred:true },
    { id:41, cat:'sicurezza', p:1, name:'Estintore CO₂',
      brand:'Desautel o certificato CE (2kg)',
      desc:'Unico estintore che non distrugge il laser in caso di fiamme. Il polvere danneggia irreparabilmente ottiche e schede. CO₂ = sicuro su elettronica.',
      supplier:'Antinfortunistica / Amazon', price_range:'€50–90', link:'https://www.amazon.it/s?k=estintore+co2+2kg+certificato',
      img:'', notes:'OBBLIGATORIO. Non usare mai polvere vicino al laser', starred:true },
    { id:42, cat:'sicurezza', p:1, name:'Occhiali Protezione Laser',
      brand:'Lasermet o Kentek (OD 5+)',
      desc:'Specifici per la lunghezza d\'onda del tuo laser. OD5+ = blocca oltre 99.999% dell\'energia. Non usare occhiali da sole o generici.',
      supplier:'Amazon / Lasermet.co.uk', price_range:'€20–80', link:'https://www.amazon.it/s?k=occhiali+protezione+laser+OD5',
      img:'', notes:'Controlla la lunghezza d\'onda: CO2=10600nm, Diodo=445-455nm, Fiber=1064nm', starred:true },
    { id:43, cat:'sicurezza', p:1, name:'Pannello Forato IKEA SKÅDIS',
      brand:'IKEA SKÅDIS (varie misure)',
      desc:'Il sistema più bello e modulare per tenere i tool in ordine. Accessori di ogni tipo, personalizzabile all\'infinito. Costa pochissimo.',
      supplier:'IKEA', price_range:'€10–30', link:'https://www.ikea.com/it/it/search/?q=skadis',
      img:'', notes:'56×56cm è il più versatile. Compra accessori: cesti, uncini, mensoline', starred:true },
    { id:44, cat:'sicurezza', p:2, name:'Aspiratore Fumi Laser',
      brand:'OMTech Smoke Purifier o Bofa',
      desc:'Filtra PM2.5, COV e odori durante la lavorazione. HEPA + carbone attivo. Obbligatorio per ambienti chiusi.',
      supplier:'Amazon / OMTech', price_range:'€150–400', link:'https://www.amazon.it/s?k=laser+smoke+purifier+hepa',
      img:'', notes:'Cambia filtri ogni 3-6 mesi. Bofa = professionale ma caro', starred:false },
    { id:45, cat:'sicurezza', p:2, name:'Guanti Antitaglio EN388',
      brand:'Uvex o Ansell (Livello C)',
      desc:'Protezione dalle lame di taglio laser e utensili. EN388 livello C = resistente ai tagli. Indispensabile per pezzi con bordi affilati.',
      supplier:'Amazon / Antinfortunistica', price_range:'€15–35', link:'https://www.amazon.it/s?k=guanti+antitaglio+EN388',
      img:'', notes:'Tieni un paio L e uno XL per ospiti/collaboratori', starred:false },
    { id:46, cat:'sicurezza', p:3, name:'Sensore CO + Allarme',
      brand:'Google Nest Protect o Kidde',
      desc:'Monitora monossido di carbonio e fumo nel laboratorio. Collegato allo smartphone per alert da remoto.',
      supplier:'Amazon', price_range:'€40–100', link:'https://www.amazon.it/s?k=sensore+co+allarme+laboratorio',
      img:'', notes:'Posiziona vicino al laser, non sul soffitto (il fumo sale, il CO no)', starred:false },

    // ── LASER & MATERIALI ────────────────────────────────────────────
    { id:50, cat:'laser',     p:1, name:'MDF 3mm Premium (Birch)',
      brand:'Worbla, Laserplust o CraftCloset',
      desc:'Il materiale base per il 90% dei progetti. MDF Birch = incisione chiara, taglio netto, zero bave. Superiore all\'MDF standard da ferramenta.',
      supplier:'Laserplust.it / CraftCloset', price_range:'€1.5–3/foglio A4', link:'https://www.laserplust.it',
      img:'', notes:'Spessore 3mm = standard. 3.2mm = per K40. Misura sempre prima', starred:true },
    { id:51, cat:'laser',     p:1, name:'Acrilico Colato (Cast) 3mm',
      brand:'Polcast o Plexiglas GS',
      desc:'Cast (colato) vs Extruded: colato = incisione latte bianca perfetta, taglio nitido. Extruded = più economico ma incisione trasparente.',
      supplier:'Necchishop / CPL Fabbrika', price_range:'€3–8/foglio A4', link:'https://www.necchishop.com',
      img:'', notes:'Sempre CAST per incisioni. EXTRUDED solo per tagli trasparenti', starred:true },
    { id:52, cat:'laser',     p:2, name:'Cartoncino Kraft',
      brand:'Favini Crush o Carta Gmund',
      desc:'Perfetto per packaging eco, biglietti e scatole laser. Il Kraft ha profondità di colore bellissima. Zero plastica.',
      supplier:'Amazon / Cartotecnica', price_range:'€0.05–0.3/fg', link:'https://www.amazon.it/s?k=cartoncino+kraft+250gr+laser',
      img:'', notes:'250–350g/m² per scatole robuste. 200g per biglietti', starred:false },
    { id:53, cat:'laser',     p:2, name:'Sughero 3-6mm',
      brand:'Fogli sfusi o rotoli',
      desc:'Naturale, eco, morbido. Ideale per sottobicchieri, basi, elementi decorativi. Incide benissimo e ha un profumo caratteristico.',
      supplier:'Amazon / Ferramenta', price_range:'€2–5/foglio A4', link:'https://www.amazon.it/s?k=sughero+fogli+laser',
      img:'', notes:'Fissa con nastro biadesivo sul honeycomb. Velocità alta, potenza bassa', starred:false },
    { id:54, cat:'laser',     p:1, name:'Letti Honeycomb per Laser',
      brand:'OMTech / Compatibili',
      desc:'Il piano di taglio essenziale. Evita riflessi del laser, dissipa il calore, permette l\'estrazione fumi dal basso.',
      supplier:'Amazon / OMTech', price_range:'€30–80', link:'https://www.amazon.it/s?k=honeycomb+laser+cutter+bed',
      img:'', notes:'Misura: taglia leggermente più piccolo del piano di lavoro', starred:true },

    // ── MISURA & PRECISIONE ──────────────────────────────────────────
    { id:60, cat:'misura',    p:1, name:'Calibro Digitale',
      brand:'Mitutoyo o Borletti (0.01mm)',
      desc:'Precisione millimetrica per misurare il legno (fondamentale per incastri). LCD, zero assoluto, impermeabile IP67.',
      supplier:'Amazon / Ferramenta', price_range:'€30–150', link:'https://www.amazon.it/s?k=calibro+digitale+mitutoyo',
      img:'', notes:'Il Mitutoyo è per sempre. Ogni 0.1mm conta per gli incastri', starred:true },
    { id:61, cat:'misura',    p:1, name:'Squadra + Righello in Acciaio',
      brand:'Gyokucho o Shinwa',
      desc:'Per allineare i pezzi nel laser e verificare angoli retti. In acciaio antiruggine, precisione 0.5mm.',
      supplier:'Amazon / Ferramenta', price_range:'€15–40', link:'https://www.amazon.it/s?k=squadra+acciaio+falegname',
      img:'', notes:'La squadra magnetica è utilissima per posizionare pezzi nel laser', starred:false },
    { id:62, cat:'misura',    p:2, name:'Termometro a Infrarossi',
      brand:'Fluke o generico Amazon',
      desc:'Per monitorare la temperatura della pressa termica e del laser. Misura senza contatto, precisione ±1.5°C.',
      supplier:'Amazon', price_range:'€15–60', link:'https://www.amazon.it/s?k=termometro+infrarossi',
      img:'', notes:'Controlla la pressa: 180°C ≠ 195°C = differenza enorme in sublimazione', starred:false },
    { id:63, cat:'misura',    p:3, name:'Bilancia di Precisione',
      brand:'Kern o American Weigh (0.01g)',
      desc:'Per pesare resina, pigmenti, materiali rari. Indispensabile se fai colori custom o miscele.',
      supplier:'Amazon', price_range:'€20–50', link:'https://www.amazon.it/s?k=bilancia+precisione+0.01g',
      img:'', notes:'Rango 500g-1000g è sufficiente per laboratorio artigianale', starred:false },
  ],

  getItems() {
    try {
      const saved = JSON.parse(localStorage.getItem(this._SK)||'null');
      if(saved && Array.isArray(saved)) return saved;
    } catch {}
    return JSON.parse(JSON.stringify(this.DEFAULT_ITEMS));
  },

  saveItems(items) { localStorage.setItem(this._SK, JSON.stringify(items)); },

  async render() {
    const el = document.getElementById('view-lab_musthave');
    if(!el) return;
    const items  = this.getItems();
    const lang   = (typeof I18n !== 'undefined') ? I18n.lang : 'it';

    el.innerHTML = `
    <div style="padding:0;max-width:1200px;margin:0 auto">

      <!-- ══ STICKY HEADER ══ -->
      <div style="position:sticky;top:0;z-index:20;background:var(--bg-card);border-bottom:1px solid var(--border);padding:14px 20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🧰</div>
          <div style="flex:1">
            <h2 style="margin:0;font-size:18px;font-weight:900">Laboratorio Must Have</h2>
            <div style="font-size:11px;color:var(--text-muted)">${items.length} prodotti · curati per artigiani laser</div>
          </div>
          <button onclick="LabMustHave.openAdd()"
            style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">+ Aggiungi</button>
          <button onclick="LabMustHave.resetToDefaults()"
            style="padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">↺</button>
        </div>

        <!-- Search -->
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <input id="lab-search" type="text" placeholder="🔍 Cerca prodotto, marca, fornitore..."
            class="form-control" style="flex:1;font-size:12px"
            value="${this._search}" oninput="LabMustHave._search=this.value;LabMustHave.render()">
        </div>

        <!-- Category filter tabs -->
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${this.CATS.map(cat=>{
            const count = cat.id === 'all' ? items.length : items.filter(i=>i.cat===cat.id).length;
            const active = this._filter === cat.id;
            return `<button onclick="LabMustHave._filter='${cat.id}';LabMustHave.render()"
              style="padding:5px 10px;background:${active?cat.color+'25':'var(--bg-card2)'};border:1.5px solid ${active?cat.color:' var(--border)'};border-radius:20px;cursor:pointer;font-size:11px;font-weight:${active?700:500};color:${active?cat.color:'var(--text-muted)'}">
              ${cat.icon} ${cat.label} <span style="opacity:.7;font-size:10px">${count}</span>
            </button>`;
          }).join('')}
        </div>
      </div>

      <!-- ══ GRID ══ -->
      <div style="padding:16px 20px">
        ${this._renderGrid(items)}
      </div>

    </div>`;
  },

  _renderGrid(allItems) {
    const filtered = allItems.filter(item => {
      const catOk = this._filter === 'all' || item.cat === this._filter;
      const s = this._search.toLowerCase();
      const searchOk = !s || [item.name, item.brand, item.desc, item.supplier, item.notes].some(f=>(f||'').toLowerCase().includes(s));
      return catOk && searchOk;
    });

    if(!filtered.length) return `<div style="text-align:center;padding:60px;color:var(--text-dim)">
      <div style="font-size:48px;margin-bottom:12px;opacity:.3">🔍</div>
      <div style="font-size:14px;font-weight:700">Nessun risultato</div>
    </div>`;

    // Group by priority
    const byPrio = { 1:[], 2:[], 3:[] };
    filtered.forEach(i => (byPrio[i.p] = byPrio[i.p]||[]).push(i));

    const prioLabels = {
      1: { label:'🔴 Essenziali — Non puoi lavorare senza', color:'#ef4444' },
      2: { label:'🟠 Importanti — Migliorano qualità e velocità', color:'#f97316' },
      3: { label:'🟢 Nice to Have — Livello Pro', color:'#22c55e' },
    };

    return Object.entries(byPrio).filter(([,items])=>items.length).map(([prio, items])=>`
    <div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${prioLabels[prio].color}30">
        <span style="font-size:13px;font-weight:800;color:${prioLabels[prio].color}">${prioLabels[prio].label}</span>
        <span style="font-size:11px;color:var(--text-dim);margin-left:auto">${items.length} prodotti</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${items.map(item => this._renderCard(item)).join('')}
      </div>
    </div>`).join('');
  },

  _renderCard(item) {
    const cat  = this.CATS.find(c=>c.id===item.cat) || this.CATS[0];
    const pColors = { 1:'#ef4444', 2:'#f97316', 3:'#22c55e' };
    const imgHTML = item.img
      ? `<img src="${item.img}" style="width:100%;height:130px;object-fit:cover;border-radius:8px 8px 0 0" onerror="this.style.display='none'">`
      : `<div style="height:70px;background:linear-gradient(135deg,${cat.color}20,${cat.color}05);display:flex;align-items:center;justify-content:center;font-size:32px;border-radius:8px 8px 0 0">${cat.icon}</div>`;

    return `
    <div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden;border-left:3px solid ${pColors[item.p]};transition:.15s"
      onmouseover="this.style.borderColor='${cat.color}'" onmouseout="this.style.borderColor='${pColors[item.p]}'">
      ${imgHTML}
      <div style="padding:10px 12px">
        <!-- Header -->
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:800;color:var(--text);line-height:1.3">${item.name}</div>
            <div style="font-size:11px;color:${cat.color};font-weight:700;margin-top:1px">${item.brand}</div>
          </div>
          ${item.starred?`<span style="font-size:14px;flex-shrink:0" title="Consigliato">⭐</span>`:''}
        </div>
        <!-- Description -->
        <div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${item.desc}</div>
        <!-- Notes -->
        ${item.notes?`<div style="font-size:10px;color:var(--text-dim);font-style:italic;margin-bottom:7px;padding:5px 8px;background:var(--bg-card);border-radius:5px;border-left:2px solid ${cat.color}">💡 ${item.notes}</div>`:''}
        <!-- Footer -->
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:9px;padding:2px 7px;background:${cat.color}20;color:${cat.color};border-radius:99px;font-weight:700">${cat.icon} ${cat.label.split('&')[0].trim()}</span>
          ${item.price_range?`<span style="font-size:10px;color:var(--text-muted)">${item.price_range}</span>`:''}
          <div style="margin-left:auto;display:flex;gap:4px">
            ${item.link?`<a href="${item.link}" target="_blank" rel="noopener"
              style="padding:3px 7px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:5px;font-size:10px;font-weight:700;text-decoration:none;cursor:pointer">
              🛒 ${item.supplier?.split('/')[0]?.trim()||'Acquista'}
            </a>`:''}
            <button onclick="LabMustHave.openEdit(${item.id})"
              style="padding:3px 7px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">✏️</button>
          </div>
        </div>
      </div>
    </div>`;
  },

  openAdd() { this._openModal(null); },

  openEdit(id) {
    const items = this.getItems();
    const item  = items.find(i=>i.id===id);
    if(item) this._openModal(item);
  },

  _openModal(item) {
    document.getElementById('lab-modal')?.remove();
    const isNew = !item;
    if(!item) item = { id:Date.now(), cat:'colla', p:1, name:'', brand:'', desc:'', supplier:'', price_range:'', link:'', img:'', notes:'', starred:false };

    const modal = document.createElement('div');
    modal.id = 'lab-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(580px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);z-index:5">
        <span style="font-size:20px">${isNew?'➕':'✏️'}</span>
        <div style="font-size:14px;font-weight:800;flex:1">${isNew?'Nuovo prodotto':'Modifica prodotto'}</div>
        <button onclick="document.getElementById('lab-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Nome prodotto *</label>
            <input id="lm-name" class="form-control" value="${item.name}" placeholder="Es. Colla Cianoacrilica" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Marca / Modello</label>
            <input id="lm-brand" class="form-control" value="${item.brand}" placeholder="Es. Mitreapel 705" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Prezzo indicativo</label>
            <input id="lm-price" class="form-control" value="${item.price_range}" placeholder="Es. €15–25" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Categoria</label>
            <select id="lm-cat" class="form-control" style="font-size:12px">
              ${this.CATS.filter(c=>c.id!=='all').map(c=>`<option value="${c.id}" ${item.cat===c.id?'selected':''}>${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Priorità</label>
            <select id="lm-prio" class="form-control" style="font-size:12px">
              <option value="1" ${item.p===1?'selected':''}>🔴 Essenziale</option>
              <option value="2" ${item.p===2?'selected':''}>🟠 Importante</option>
              <option value="3" ${item.p===3?'selected':''}>🟢 Nice to Have</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Descrizione</label>
            <textarea id="lm-desc" class="form-control" rows="3" style="font-size:12px;resize:vertical">${item.desc}</textarea>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Fornitore / Dove comprare</label>
            <input id="lm-supplier" class="form-control" value="${item.supplier}" placeholder="Es. Amazon / Bricoman" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Link acquisto</label>
            <input id="lm-link" class="form-control" value="${item.link}" placeholder="https://..." style="font-size:12px">
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">💡 Nota pro / Tips d'uso</label>
            <input id="lm-notes" class="form-control" value="${item.notes}" placeholder="Consiglio pratico..." style="font-size:12px">
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🖼 URL o base64 immagine prodotto</label>
            <div style="display:flex;gap:6px">
              <input id="lm-img-url" class="form-control" value="${item.img&&!item.img.startsWith('data:')?item.img:''}" placeholder="https://... URL immagine" style="font-size:12px;flex:1">
              <label style="padding:6px 10px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted);white-space:nowrap">
                📷 Upload
                <input type="file" accept="image/*" style="display:none" onchange="LabMustHave._uploadImg(this)">
              </label>
            </div>
            ${item.img?`<img src="${item.img}" style="height:60px;margin-top:6px;border-radius:6px;object-fit:cover" onerror="this.remove()">`:''}
          </div>
          <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="lm-starred" ${item.starred?'checked':''} style="width:16px;height:16px;accent-color:var(--primary)">
            <label for="lm-starred" style="font-size:12px;cursor:pointer">⭐ Prodotto consigliato (mostra stella)</label>
          </div>
        </div>
        <div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid var(--border)">
          <button onclick="LabMustHave._saveModal(${item.id}, ${isNew})"
            style="flex:1;padding:10px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">
            💾 ${isNew?'Aggiungi':'Salva modifiche'}
          </button>
          ${!isNew?`<button onclick="LabMustHave._delete(${item.id})"
            style="padding:10px 14px;background:#ef444415;border:1px solid #ef444430;border-radius:8px;cursor:pointer;font-size:12px;color:#ef4444;font-weight:700">🗑</button>`:''}
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('lm-name')?.focus();
  },

  _uploadImg(input) {
    const file = input.files[0];
    if(!file) return;
    if(file.size > 300*1024) { toast('Immagine troppo grande (max 300KB)', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('lab-modal').querySelector('img[src^="data:"]');
      if(prev) prev.remove();
      const img = document.createElement('img');
      img.src   = e.target.result;
      img.style.cssText = 'height:60px;margin-top:6px;border-radius:6px;object-fit:cover';
      document.getElementById('lm-img-url').parentNode.after(img);
      document.getElementById('lm-img-url').dataset.base64 = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  _saveModal(id, isNew) {
    const v = sel => document.getElementById(sel)?.value?.trim()||'';
    const imgInput = document.getElementById('lm-img-url');
    const img = imgInput?.dataset.base64 || v('lm-img-url');
    const item = {
      id:       isNew ? Date.now() : id,
      cat:      v('lm-cat'),
      p:        parseInt(v('lm-prio'))||1,
      name:     v('lm-name'),
      brand:    v('lm-brand'),
      desc:     document.getElementById('lm-desc')?.value?.trim()||'',
      supplier: v('lm-supplier'),
      price_range: v('lm-price'),
      link:     v('lm-link'),
      img,
      notes:    v('lm-notes'),
      starred:  document.getElementById('lm-starred')?.checked||false,
    };
    if(!item.name) { toast('Inserisci il nome del prodotto','warning'); return; }
    const items = this.getItems();
    if(isNew) { items.push(item); }
    else { const idx = items.findIndex(i=>i.id===id); if(idx>=0) items[idx]=item; }
    this.saveItems(items);
    document.getElementById('lab-modal')?.remove();
    this.render();
    toast(isNew?'✅ Prodotto aggiunto!':'✅ Modifiche salvate!','success');
  },

  _delete(id) {
    if(!confirm('Eliminare questo prodotto?')) return;
    const items = this.getItems().filter(i=>i.id!==id);
    this.saveItems(items);
    document.getElementById('lab-modal')?.remove();
    this.render();
    toast('🗑 Prodotto eliminato','info');
  },

  resetToDefaults() {
    if(!confirm('Ripristinare la lista predefinita? Le tue modifiche andranno perse.')) return;
    localStorage.removeItem(this._SK);
    this.render();
    toast('↺ Lista ripristinata ai defaults','info');
  },
};
window.LabMustHave = LabMustHave;

// ── INSTALL ──────────────────────────────────────────────────────────
(function installLabMustHave(){
  const tryInstall = () => {
    if(typeof App==='undefined') return setTimeout(tryInstall, 800);

    if(!document.getElementById('view-lab_musthave')) {
      const lrView = document.getElementById('view-laserresources');
      const div = document.createElement('div');
      div.className='section-view'; div.id='view-lab_musthave';
      if(lrView) lrView.parentNode.insertBefore(div, lrView.nextSibling);
      else document.body.appendChild(div);
    }

    if(!document.querySelector('[data-section="lab_musthave"]')) {
      const lrNav = document.querySelector('[data-section="laserresources"]');
      if(lrNav) {
        const nav = document.createElement('div');
        nav.className='nav-item';
        nav.setAttribute('data-section','lab_musthave');
        nav.onclick=()=>App.navigate('lab_musthave');
        nav.innerHTML='<i class="fas fa-toolbox" style="color:#f97316;font-size:11px"></i> 🧰 Lab Must Have';
        lrNav.parentNode.insertBefore(nav, lrNav.nextSibling);
      }
    }

    if(!App.__labPatch) {
      App.__labPatch=true;
      const _origRS=App.renderSection?.bind(App);
      if(_origRS) App.renderSection=function(s){
        if(s==='lab_musthave'){LabMustHave.render();return;}
        _origRS(s);
      };
    }
    console.log('[LabMustHave] Installed ✅');
  };
  setTimeout(tryInstall,2000);
})();


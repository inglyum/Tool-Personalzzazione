
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v33 — Catalogo B2B Professionale
// Multi-fornitore · Prezzi competitivi aggiornati · +180 prodotti
// ═══════════════════════════════════════════════════════════════════
;(function _catalogV33(){
  function _p(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._v32pro){ setTimeout(_p,600); return; }
    if(LaserB2B._v33catalog) return;
    LaserB2B._v33catalog=true;

    // ── FORNITORI CON URL DIRETTI ─────────────────────────────
    var SUPS={
      g365:  {name:'gadget365.it',     url:'https://www.gadget365.it',       note:'Spediz. 24/48h · Min 1pz'},
      g48:   {name:'gadget48.com',     url:'https://www.gadget48.com',       note:'Spediz. 48/72h · Min 1pz'},
      hig:   {name:'higift.it',        url:'https://www.higift.it',          note:'B2B · Min 25pz'},
      sub:   {name:'sublimet.com',     url:'https://www.sublimet.com',       note:'Sub specialist · Min 1pz'},
      sub2:  {name:'sublimazione.it',  url:'https://www.sublimazione.it',    note:'Sub bulk · prezzi grossista'},
      templ: {name:'temaplex-shop.com',url:'https://temaplex-shop.com',      note:'Plexiglass taglio laser'},
      word:  {name:'wordans.it',       url:'https://www.wordans.it',         note:'Abbigliamento B2B'},
      cpl:   {name:'cplfabbrika.com',  url:'https://www.cplfabbrika.com',    note:'DTF · Sub · Transfer'},
      amz:   {name:'amazon.it',        url:'https://www.amazon.it',          note:'Consegna rapida · Prime'},
      alil:  {name:'alibaba.com',      url:'https://www.alibaba.com',        note:'Prezzi fabbrica · Min 100pz · 20gg spediz.'},
      icel:  {name:'icegadget.it',     url:'https://www.icegadget.it',       note:'Gadget promo · Min 50pz'},
      logo:  {name:'logodesktop.com',  url:'https://www.logodesktop.com',    note:'Laser blanks · B2B Italia'},
      brm:   {name:'bricoman.it',      url:'https://www.bricoman.it',        note:'MDF · legno · DIY'},
      tmpl2: {name:'temaplex.it',      url:'https://www.temaplex.it',        note:'Plexiglass stock · taglio'},
      decol: {name:'decoriamo.it',     url:'https://www.decoriamo.it',       note:'Bomboniere · oggettistica'},
      crea:  {name:'creacadeau.eu',    url:'https://www.creacadeau.eu',      note:'Gadget personalizzabili EU'},
    };
    LaserB2B._SUPPLIERS = SUPS;

    // Helper: best price from suppliers array
    function bestSup(arr){ return arr.reduce(function(a,b){return b.price<a.price?b:a;},arr[0]); }

    // ── CATALOGO COMPLETO CON MULTI-FORNITORE ─────────────────
    var CATALOG_V33 = [

      // ═══════════════ PORTACHIAVI BAMBÙ ════════════════════════
      {id:'pk_bambu_rot35',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø35mm',   timeMin:1.2,
       suppliers:[{s:'g365',p:0.32},{s:'hig',p:0.29,minQty:25},{s:'icel',p:0.27,minQty:50},{s:'alil',p:0.12,minQty:200}]},
      {id:'pk_bambu_rot40',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø40mm',   timeMin:1.5,
       suppliers:[{s:'g365',p:0.38},{s:'hig',p:0.35,minQty:25},{s:'icel',p:0.32,minQty:50},{s:'alil',p:0.15,minQty:200}]},
      {id:'pk_bambu_rot50',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø50mm',   timeMin:1.8,
       suppliers:[{s:'g365',p:0.55},{s:'hig',p:0.50,minQty:25},{s:'alil',p:0.18,minQty:200}]},
      {id:'pk_bambu_rett_s', tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rettangolare 50×25mm', timeMin:1.5,
       suppliers:[{s:'g365',p:0.38},{s:'hig',p:0.35,minQty:25},{s:'alil',p:0.13,minQty:200}]},
      {id:'pk_bambu_rett_m', tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rettangolare 65×30mm', timeMin:1.5,
       suppliers:[{s:'g365',p:0.45},{s:'hig',p:0.42,minQty:25},{s:'alil',p:0.15,minQty:200}]},
      {id:'pk_bambu_cuore',  tech:'laser',cat:'Portachiavi',img:'❤️',name:'Portachiavi Bambù Cuore',            timeMin:2.0,
       suppliers:[{s:'g365',p:0.88},{s:'hig',p:0.82,minQty:25},{s:'alil',p:0.28,minQty:100}]},
      {id:'pk_bambu_stella', tech:'laser',cat:'Portachiavi',img:'⭐',name:'Portachiavi Bambù Stella',           timeMin:2.2,
       suppliers:[{s:'g365',p:0.95},{s:'hig',p:0.88,minQty:25},{s:'alil',p:0.30,minQty:100}]},
      {id:'pk_bambu_casa',   tech:'laser',cat:'Portachiavi',img:'🏠',name:'Portachiavi Bambù Forma Casa',       timeMin:2.0,
       suppliers:[{s:'g365',p:0.85},{s:'hig',p:0.80,minQty:25},{s:'alil',p:0.28,minQty:100}]},
      {id:'pk_bambu_mappa',  tech:'laser',cat:'Portachiavi',img:'🗺️',name:'Portachiavi Bambù Mappa Italia',    timeMin:2.5,
       suppliers:[{s:'g365',p:0.95},{s:'alil',p:0.32,minQty:100}]},
      {id:'pk_bambu_bott',   tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Forma Bottiglia',  timeMin:2.0,
       suppliers:[{s:'g365',p:0.85},{s:'hig',p:0.79,minQty:25},{s:'alil',p:0.28,minQty:100}]},
      // Portachiavi acciaio inox
      {id:'pk_inox_rot',     tech:'laser',cat:'Portachiavi',img:'⚪',name:'Portachiavi Inox Rotondo 30mm',      timeMin:1.8,
       suppliers:[{s:'g48',p:1.25},{s:'hig',p:1.35,minQty:25},{s:'amz',p:1.10,minQty:50},{s:'alil',p:0.45,minQty:200}]},
      {id:'pk_inox_rett',    tech:'laser',cat:'Portachiavi',img:'⚪',name:'Portachiavi Inox Rettangolare 50×25mm',timeMin:1.8,
       suppliers:[{s:'g48',p:1.35},{s:'hig',p:1.40,minQty:25},{s:'amz',p:1.20,minQty:50},{s:'alil',p:0.50,minQty:200}]},
      {id:'pk_inox_ovale',   tech:'laser',cat:'Portachiavi',img:'⚪',name:'Portachiavi Inox Ovale 45×28mm',     timeMin:2.0,
       suppliers:[{s:'g48',p:1.45},{s:'hig',p:1.50,minQty:25},{s:'alil',p:0.55,minQty:200}]},
      // Portachiavi alluminio
      {id:'pk_allum_rot',    tech:'laser',cat:'Portachiavi',img:'🔘',name:'Portachiavi Alluminio Rotondo 30mm', timeMin:1.5,
       suppliers:[{s:'hig',p:0.83},{s:'g365',p:0.90},{s:'alil',p:0.28,minQty:200}]},
      {id:'pk_allum_rett',   tech:'laser',cat:'Portachiavi',img:'🔘',name:'Portachiavi Alluminio Rettangolare', timeMin:1.5,
       suppliers:[{s:'hig',p:0.85},{s:'g365',p:0.92},{s:'alil',p:0.30,minQty:200}]},
      // Portachiavi plexiglass
      {id:'pk_plexi_tr',     tech:'laser',cat:'Portachiavi',img:'💎',name:'Portachiavi Plexiglass Trasparente', timeMin:1.5,
       suppliers:[{s:'templ',p:0.80},{s:'templ2',p:0.75,minQty:50},{s:'alil',p:0.22,minQty:200}]},
      {id:'pk_plexi_spec',   tech:'laser',cat:'Portachiavi',img:'✨',name:'Portachiavi Plexiglass Specchiato',  timeMin:1.8,
       suppliers:[{s:'templ',p:1.20},{s:'templ2',p:1.10,minQty:50},{s:'alil',p:0.35,minQty:200}]},
      {id:'pk_plexi_fluor',  tech:'laser',cat:'Portachiavi',img:'🌈',name:'Portachiavi Plexiglass Colorato Fluo',timeMin:1.8,
       suppliers:[{s:'templ',p:0.95},{s:'templ2',p:0.88,minQty:50},{s:'alil',p:0.28,minQty:200}]},
      // Portachiavi pelle
      {id:'pk_pelle_rett',   tech:'laser',cat:'Portachiavi',img:'🟤',name:'Portachiavi Pelle Naturale 60×30mm', timeMin:2.0,
       suppliers:[{s:'g48',p:2.20},{s:'hig',p:2.40,minQty:25},{s:'alil',p:0.80,minQty:100}]},
      {id:'pk_pelle_rotondo',tech:'laser',cat:'Portachiavi',img:'🟤',name:'Portachiavi Pelle Rotondo Ø45mm',   timeMin:2.0,
       suppliers:[{s:'g48',p:2.40},{s:'alil',p:0.85,minQty:100}]},

      // ═══════════════ PENNE & MATITE ═══════════════════════════
      {id:'pen_bambu',       tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Penna Bambù Naturale Clip',       timeMin:1.5,
       suppliers:[{s:'g365',p:0.95},{s:'hig',p:0.99,minQty:25},{s:'icel',p:0.88,minQty:50},{s:'alil',p:0.32,minQty:200}]},
      {id:'pen_bambu_touch', tech:'laser',cat:'Penne & Matite',img:'✏️',name:'Penna Bambù Touch Screen',        timeMin:1.5,
       suppliers:[{s:'g365',p:1.20},{s:'hig',p:1.25,minQty:25},{s:'alil',p:0.45,minQty:200}]},
      {id:'pen_metallo_arg', tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Penna Metallo Silver Clip',       timeMin:1.8,
       suppliers:[{s:'g365',p:1.80},{s:'hig',p:1.90,minQty:25},{s:'alil',p:0.65,minQty:200}]},
      {id:'pen_metallo_nero',tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Penna Metallo Nero Premium',      timeMin:1.8,
       suppliers:[{s:'g365',p:2.20},{s:'hig',p:2.40,minQty:25},{s:'alil',p:0.80,minQty:200}]},
      {id:'pen_set2',        tech:'laser',cat:'Penne & Matite',img:'✒️',name:'Set Penna + Matita Bambu',        timeMin:3.0,
       suppliers:[{s:'g365',p:1.90},{s:'hig',p:2.10,minQty:25},{s:'alil',p:0.70,minQty:100}]},
      {id:'pen_bambu_eco',   tech:'laser',cat:'Penne & Matite',img:'🌿',name:'Penna Bambù Eco Mini',            timeMin:1.2,
       suppliers:[{s:'g365',p:0.75},{s:'alil',p:0.25,minQty:200}]},

      // ═══════════════ TARGHE & PLACCHE ═════════════════════════
      {id:'targa_bambu_s',   tech:'laser',cat:'Targhe & Placche',img:'🪵',name:'Targa Bambù 100×50mm',          timeMin:2.5,
       suppliers:[{s:'g365',p:0.85},{s:'logo',p:0.78,minQty:50},{s:'alil',p:0.30,minQty:100}]},
      {id:'targa_bambu_m',   tech:'laser',cat:'Targhe & Placche',img:'🪵',name:'Targa Bambù 150×75mm',          timeMin:3.0,
       suppliers:[{s:'g365',p:1.20},{s:'logo',p:1.10,minQty:50},{s:'alil',p:0.40,minQty:100}]},
      {id:'targa_mdf_s',     tech:'laser',cat:'Targhe & Placche',img:'📋',name:'Targa MDF 3mm 100×50mm',        timeMin:2.5,
       suppliers:[{s:'logo',p:0.55},{s:'brm',p:0.60},{s:'alil',p:0.18,minQty:100}]},
      {id:'targa_mdf_m',     tech:'laser',cat:'Targhe & Placche',img:'📋',name:'Targa MDF 3mm 150×75mm',        timeMin:3.0,
       suppliers:[{s:'logo',p:0.75},{s:'brm',p:0.80},{s:'alil',p:0.25,minQty:100}]},
      {id:'targa_inox_s',    tech:'laser',cat:'Targhe & Placche',img:'⬜',name:'Targa Acciaio Inox 100×50mm',    timeMin:3.5,
       suppliers:[{s:'g48',p:2.50},{s:'hig',p:2.80,minQty:25},{s:'alil',p:1.00,minQty:100}]},
      {id:'targa_inox_m',    tech:'laser',cat:'Targhe & Placche',img:'⬜',name:'Targa Acciaio Inox 150×100mm',   timeMin:4.0,
       suppliers:[{s:'g48',p:4.20},{s:'hig',p:4.80,minQty:25},{s:'alil',p:1.60,minQty:100}]},
      {id:'targa_allum_an',  tech:'laser',cat:'Targhe & Placche',img:'🔵',name:'Targa Alluminio Anodizzato 100×50',timeMin:3.0,
       suppliers:[{s:'g48',p:1.80},{s:'hig',p:2.00,minQty:25},{s:'alil',p:0.65,minQty:100}]},
      {id:'targa_plexi_tr',  tech:'laser',cat:'Targhe & Placche',img:'💠',name:'Targa Plexiglass Trasparente 150×100',timeMin:3.0,
       suppliers:[{s:'templ',p:1.50},{s:'templ2',p:1.30,minQty:50},{s:'alil',p:0.50,minQty:100}]},
      {id:'targa_plexi_spec',tech:'laser',cat:'Targhe & Placche',img:'✨',name:'Targa Plexiglass Specchiato Oro', timeMin:3.5,
       suppliers:[{s:'templ',p:2.80},{s:'templ2',p:2.50,minQty:50}]},
      {id:'numcivico_inox',  tech:'laser',cat:'Targhe & Placche',img:'🔢',name:'Numero Civico Inox 120×120mm',   timeMin:3.0,
       suppliers:[{s:'g48',p:3.50},{s:'alil',p:1.20,minQty:50}]},

      // ═══════════════ MEDAGLIE & PREMI ═════════════════════════
      {id:'med_allum_50',    tech:'laser',cat:'Medaglie & Premi',img:'🥇',name:'Medaglia Alluminio Rotonda Ø50mm',timeMin:2.0,
       suppliers:[{s:'g365',p:1.50},{s:'hig',p:1.60,minQty:25},{s:'alil',p:0.55,minQty:100}]},
      {id:'med_allum_70',    tech:'laser',cat:'Medaglie & Premi',img:'🥇',name:'Medaglia Alluminio Rotonda Ø70mm',timeMin:2.5,
       suppliers:[{s:'g365',p:2.20},{s:'hig',p:2.40,minQty:25},{s:'alil',p:0.80,minQty:100}]},
      {id:'med_zincata',     tech:'laser',cat:'Medaglie & Premi',img:'🏅',name:'Medaglia Zincata Premio Ø60mm',   timeMin:2.2,
       suppliers:[{s:'g365',p:1.80},{s:'hig',p:1.90,minQty:25},{s:'alil',p:0.65,minQty:100}]},
      {id:'trofeo_bambu_s',  tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Bambù Piccolo 10cm',      timeMin:3.5,
       suppliers:[{s:'g365',p:2.50},{s:'logo',p:2.20,minQty:25},{s:'alil',p:0.90,minQty:50}]},
      {id:'trofeo_bambu_m',  tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Bambù Medio 15cm',        timeMin:4.5,
       suppliers:[{s:'g365',p:4.20},{s:'logo',p:3.80,minQty:25},{s:'alil',p:1.50,minQty:50}]},
      {id:'trofeo_plexi',    tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Plexiglass 15cm',         timeMin:5.0,
       suppliers:[{s:'templ',p:3.50},{s:'templ2',p:3.00,minQty:25}]},

      // ═══════════════ GADGET CUCINA ════════════════════════════
      {id:'tagl_bambu_s',    tech:'laser',cat:'Gadget Cucina',img:'🔪',name:'Tagliere Bambù Piccolo 20×15cm',   timeMin:3.0,
       suppliers:[{s:'g365',p:2.80},{s:'hig',p:3.00,minQty:25},{s:'amz',p:2.50,minQty:10},{s:'alil',p:0.95,minQty:50}]},
      {id:'tagl_bambu_m',    tech:'laser',cat:'Gadget Cucina',img:'🔪',name:'Tagliere Bambù Medio 30×20cm',     timeMin:4.0,
       suppliers:[{s:'g365',p:3.80},{s:'hig',p:4.00,minQty:25},{s:'amz',p:3.50,minQty:10},{s:'alil',p:1.30,minQty:50}]},
      {id:'tagl_bambu_l',    tech:'laser',cat:'Gadget Cucina',img:'🔪',name:'Tagliere Bambù Grande 40×25cm',    timeMin:5.0,
       suppliers:[{s:'g365',p:5.50},{s:'amz',p:5.00,minQty:10},{s:'alil',p:1.90,minQty:50}]},
      {id:'tagl_cuore',      tech:'laser',cat:'Gadget Cucina',img:'❤️',name:'Tagliere Bambù Forma Cuore 30cm', timeMin:4.5,
       suppliers:[{s:'g365',p:4.50},{s:'hig',p:4.80,minQty:25},{s:'alil',p:1.60,minQty:50}]},
      {id:'sottobi_bambu',   tech:'laser',cat:'Gadget Cucina',img:'🍽️',name:'Sottobicchiere Bambù Ø10cm',      timeMin:1.5,
       suppliers:[{s:'g365',p:0.48},{s:'hig',p:0.52,minQty:50},{s:'alil',p:0.15,minQty:200}]},
      {id:'sottobi_set4',    tech:'laser',cat:'Gadget Cucina',img:'🍽️',name:'Set 4 Sottobicchieri Bambù',       timeMin:5.5,
       suppliers:[{s:'g365',p:1.90},{s:'amz',p:1.75,minQty:10},{s:'alil',p:0.60,minQty:50}]},
      {id:'cucch_bambu',     tech:'laser',cat:'Gadget Cucina',img:'🥄',name:'Cucchiaio Bambu da Degustazione',  timeMin:2.0,
       suppliers:[{s:'amz',p:0.55},{s:'alil',p:0.18,minQty:200}]},
      {id:'mestolo_bambu',   tech:'laser',cat:'Gadget Cucina',img:'🥄',name:'Mestolo Bambu da Cucina',          timeMin:2.5,
       suppliers:[{s:'amz',p:1.20},{s:'alil',p:0.38,minQty:100}]},

      // ═══════════════ USB & TECH ════════════════════════════════
      {id:'usb_bambu_8',     tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB Bambù 8GB',            timeMin:2.0,
       suppliers:[{s:'g365',p:3.50},{s:'hig',p:3.80,minQty:25},{s:'alil',p:1.20,minQty:100}]},
      {id:'usb_bambu_16',    tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB Bambù 16GB',           timeMin:2.0,
       suppliers:[{s:'g365',p:4.50},{s:'hig',p:4.90,minQty:25},{s:'alil',p:1.60,minQty:100}]},
      {id:'usb_bambu_32',    tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB Bambù 32GB',           timeMin:2.0,
       suppliers:[{s:'g365',p:5.80},{s:'alil',p:2.20,minQty:100}]},
      {id:'usb_legno_giro',  tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB Legno Girevole 16GB',  timeMin:2.2,
       suppliers:[{s:'hig',p:5.50},{s:'alil',p:1.80,minQty:100}]},
      {id:'usb_metallo_16',  tech:'laser',cat:'USB & Tech',img:'🔩',name:'Chiavetta USB Metallo 16GB',         timeMin:2.0,
       suppliers:[{s:'g48',p:4.80},{s:'hig',p:5.20,minQty:25},{s:'alil',p:1.50,minQty:100}]},
      {id:'card_bambu',      tech:'laser',cat:'USB & Tech',img:'💳',name:'Biglietto da Visita Bambù 85×55mm',  timeMin:1.0,
       suppliers:[{s:'logo',p:0.45},{s:'alil',p:0.12,minQty:200}]},
      {id:'power_bambu',     tech:'laser',cat:'USB & Tech',img:'🔋',name:'Powerbank Bambù 4000mAh',            timeMin:2.5,
       suppliers:[{s:'g365',p:8.50},{s:'hig',p:9.20,minQty:25},{s:'alil',p:3.50,minQty:50}]},

      // ═══════════════ SUBLIMAZIONE — TAZZE ═════════════════════
      {id:'taz_cer_11oz',    tech:'sublimazione',cat:'Tazze & Bevande',img:'☕',name:'Tazza Ceramica Bianca 11oz 325ml', timeMin:3.0,
       suppliers:[{s:'sub',p:1.47},{s:'sub2',p:1.35,minQty:24},{s:'cpl',p:1.30,minQty:12},{s:'amz',p:1.20,minQty:6}]},
      {id:'taz_cer_15oz',    tech:'sublimazione',cat:'Tazze & Bevande',img:'☕',name:'Tazza Ceramica Bianca 15oz 450ml', timeMin:3.5,
       suppliers:[{s:'sub',p:1.75},{s:'sub2',p:1.60,minQty:24},{s:'alil',p:0.65,minQty:50}]},
      {id:'taz_magic',       tech:'sublimazione',cat:'Tazze & Bevande',img:'🪄',name:'Tazza Magica Cambia Colore 11oz',  timeMin:3.5,
       suppliers:[{s:'sub',p:2.20},{s:'sub2',p:2.00,minQty:12},{s:'alil',p:0.90,minQty:50}]},
      {id:'taz_interno_col', tech:'sublimazione',cat:'Tazze & Bevande',img:'🎨',name:'Tazza Interno Colorato 11oz',       timeMin:3.0,
       suppliers:[{s:'sub',p:1.75},{s:'sub2',p:1.60,minQty:12},{s:'alil',p:0.70,minQty:50}]},
      {id:'bott_acciaio',    tech:'sublimazione',cat:'Tazze & Bevande',img:'🥤',name:'Borraccia Acciaio 500ml Sub',       timeMin:3.5,
       suppliers:[{s:'sub',p:2.80},{s:'cpl',p:2.60,minQty:12},{s:'alil',p:1.10,minQty:50}]},
      {id:'travel_mug',      tech:'sublimazione',cat:'Tazze & Bevande',img:'☕',name:'Travel Mug Termico Sub 350ml',      timeMin:3.5,
       suppliers:[{s:'sub',p:3.20},{s:'alil',p:1.30,minQty:50}]},
      {id:'bott_allum_sub',  tech:'sublimazione',cat:'Tazze & Bevande',img:'💧',name:'Borraccia Alluminio Sub 750ml',     timeMin:3.5,
       suppliers:[{s:'sub',p:2.50},{s:'cpl',p:2.30,minQty:12},{s:'alil',p:1.00,minQty:50}]},

      // ═══════════════ SUBLIMAZIONE — ARREDO ════════════════════
      {id:'cuscino_40x40',   tech:'sublimazione',cat:'Arredo & Foto',img:'🛋️',name:'Cuscino Poliestere 40×40cm + imbottitura', timeMin:4.0,
       suppliers:[{s:'sub',p:2.10},{s:'cpl',p:1.90,minQty:6},{s:'alil',p:0.80,minQty:24}]},
      {id:'puzzle_120',      tech:'sublimazione',cat:'Arredo & Foto',img:'🧩',name:'Puzzle Sublimazione 120pz 30×42cm',   timeMin:5.0,
       suppliers:[{s:'sub',p:2.90},{s:'cpl',p:2.60,minQty:6},{s:'alil',p:1.10,minQty:24}]},
      {id:'puzzle_252',      tech:'sublimazione',cat:'Arredo & Foto',img:'🧩',name:'Puzzle Sublimazione 252pz 40×56cm',   timeMin:6.0,
       suppliers:[{s:'sub',p:4.50},{s:'alil',p:1.80,minQty:12}]},
      {id:'panel_mdf_a4',    tech:'sublimazione',cat:'Arredo & Foto',img:'🖼️',name:'Pannello MDF Bianco A4 Sublimazione', timeMin:4.0,
       suppliers:[{s:'sub',p:1.20},{s:'cpl',p:1.10,minQty:12},{s:'alil',p:0.42,minQty:50}]},
      {id:'panel_mdf_a3',    tech:'sublimazione',cat:'Arredo & Foto',img:'🖼️',name:'Pannello MDF Bianco A3 Sublimazione', timeMin:5.5,
       suppliers:[{s:'sub',p:1.80},{s:'cpl',p:1.60,minQty:12},{s:'alil',p:0.65,minQty:50}]},
      {id:'cal_muro_sub',    tech:'sublimazione',cat:'Arredo & Foto',img:'📅',name:'Calendario Muro Sub A4 12 fogli',    timeMin:3.0,
       suppliers:[{s:'sub',p:3.50},{s:'alil',p:1.40,minQty:24}]},
      {id:'foto_metallo_a5', tech:'sublimazione',cat:'Arredo & Foto',img:'🖼️',name:'Lastra Alluminio Foto A5 Sub',       timeMin:3.5,
       suppliers:[{s:'sub',p:2.10},{s:'cpl',p:1.90,minQty:12},{s:'alil',p:0.80,minQty:50}]},
      {id:'foto_vetro_15x10',tech:'sublimazione',cat:'Arredo & Foto',img:'🔲',name:'Lastra Vetro Foto 15×10cm Sub',      timeMin:4.0,
       suppliers:[{s:'sub',p:2.80},{s:'alil',p:1.10,minQty:24}]},

      // ═══════════════ CALAMITE ══════════════════════════════════
      {id:'cal_bambu_rett',  tech:'laser',cat:'Calamite',img:'🧲',name:'Calamita Bambù Rettangolare 70×40mm',  timeMin:1.2,
       suppliers:[{s:'g365',p:0.55},{s:'hig',p:0.58,minQty:50},{s:'alil',p:0.18,minQty:200}]},
      {id:'cal_bambu_rot',   tech:'laser',cat:'Calamite',img:'🧲',name:'Calamita Bambù Rotonda Ø50mm',        timeMin:1.2,
       suppliers:[{s:'g365',p:0.48},{s:'hig',p:0.52,minQty:50},{s:'alil',p:0.16,minQty:200}]},
      {id:'cal_sub_rot55',   tech:'sublimazione',cat:'Calamite',img:'🧲',name:'Calamita Sub Rotonda 55mm',    timeMin:2.5,
       suppliers:[{s:'sub',p:0.45},{s:'cpl',p:0.40,minQty:24},{s:'alil',p:0.14,minQty:200}]},
      {id:'cal_sub_rett',    tech:'sublimazione',cat:'Calamite',img:'🧲',name:'Calamita Sub Rettangolare 70×45mm',timeMin:2.5,
       suppliers:[{s:'sub',p:0.50},{s:'cpl',p:0.44,minQty:24},{s:'alil',p:0.16,minQty:200}]},
      {id:'cal_mdf_forma',   tech:'laser',cat:'Calamite',img:'🧲',name:'Calamita MDF Forma Personalizzata',   timeMin:2.0,
       suppliers:[{s:'logo',p:0.45},{s:'alil',p:0.14,minQty:200}]},

      // ═══════════════ BOMBONIERE ════════════════════════════════
      {id:'bomb_bambu_rot',  tech:'laser',cat:'Bomboniere',img:'🎀',name:'Portachiavi Bomboniera Bambù Rotondo',timeMin:1.5,
       suppliers:[{s:'g365',p:0.38},{s:'decol',p:0.42,minQty:50},{s:'alil',p:0.14,minQty:200}]},
      {id:'bomb_bambu_cuore',tech:'laser',cat:'Bomboniere',img:'❤️',name:'Portachiavi Bomboniera Bambu Cuore', timeMin:2.0,
       suppliers:[{s:'g365',p:0.88},{s:'decol',p:0.92,minQty:50},{s:'alil',p:0.28,minQty:100}]},
      {id:'bomb_bambu_bott', tech:'laser',cat:'Bomboniere',img:'🍾',name:'Bottoncino Bambu Bomboniera 40mm',   timeMin:1.5,
       suppliers:[{s:'decol',p:0.75},{s:'alil',p:0.22,minQty:100}]},
      {id:'bomb_sign_bambu', tech:'laser',cat:'Bomboniere',img:'🎋',name:'Segnaposto Bambù Personalizzato',    timeMin:2.0,
       suppliers:[{s:'decol',p:0.65},{s:'g365',p:0.70,minQty:25},{s:'alil',p:0.20,minQty:100}]},
      {id:'bomb_cal_bambu',  tech:'laser',cat:'Bomboniere',img:'📅',name:'Calamita Bambù Bomboniera',         timeMin:1.2,
       suppliers:[{s:'g365',p:0.52},{s:'decol',p:0.55,minQty:50},{s:'alil',p:0.16,minQty:200}]},

      // ═══════════════ BRACCIALI & GIOIELLI ═════════════════════
      {id:'brac_bambu',      tech:'laser',cat:'Bracciali & Gioielli',img:'⭕',name:'Bracciale Bambù Piatto',    timeMin:2.0,
       suppliers:[{s:'g365',p:0.85},{s:'hig',p:0.90,minQty:25},{s:'alil',p:0.28,minQty:100}]},
      {id:'brac_legno_rot',  tech:'laser',cat:'Bracciali & Gioielli',img:'⭕',name:'Bracciale Legno Rotondo',   timeMin:2.5,
       suppliers:[{s:'g365',p:0.95},{s:'alil',p:0.32,minQty:100}]},
      {id:'brac_silicone',   tech:'laser',cat:'Bracciali & Gioielli',img:'⭕',name:'Braccialetto Silicone 20cm',timeMin:1.5,
       suppliers:[{s:'alil',p:0.22,minQty:200},{s:'amz',p:0.35,minQty:50}]},

      // ═══════════════ T-SHIRT & DTF ════════════════════════════
      {id:'tshirt_bianca_m',  tech:'dtf',cat:'T-Shirt & Felpe',img:'👕',name:'T-Shirt Bianca 100% Cotone 190g', timeMin:5.0,
       suppliers:[{s:'word',p:2.20},{s:'cpl',p:2.40,minQty:12},{s:'sub2',p:2.10,minQty:24},{s:'alil',p:1.20,minQty:50}]},
      {id:'tshirt_nera_m',    tech:'dtf',cat:'T-Shirt & Felpe',img:'👕',name:'T-Shirt Nera Premium 190g',      timeMin:5.0,
       suppliers:[{s:'word',p:2.80},{s:'cpl',p:3.00,minQty:12},{s:'alil',p:1.40,minQty:50}]},
      {id:'tshirt_col_m',     tech:'dtf',cat:'T-Shirt & Felpe',img:'🌈',name:'T-Shirt Colore Basic 190g',      timeMin:5.0,
       suppliers:[{s:'word',p:2.50},{s:'cpl',p:2.60,minQty:12},{s:'alil',p:1.30,minQty:50}]},
      {id:'felpa_cap_m',      tech:'dtf',cat:'T-Shirt & Felpe',img:'🧥',name:'Felpa Cappuccio 300g Unisex',    timeMin:7.0,
       suppliers:[{s:'word',p:7.20},{s:'cpl',p:7.80,minQty:12},{s:'alil',p:3.50,minQty:24}]},
      {id:'polo_cotone_m',    tech:'dtf',cat:'T-Shirt & Felpe',img:'👔',name:'Polo Cotone Piqué 220g',         timeMin:6.0,
       suppliers:[{s:'word',p:5.80},{s:'alil',p:2.80,minQty:24}]},
      {id:'shopper_cotton',   tech:'dtf',cat:'T-Shirt & Felpe',img:'👜',name:'Shopper Canvas Cotton 38×42cm',  timeMin:4.0,
       suppliers:[{s:'sub',p:1.80},{s:'cpl',p:1.60,minQty:12},{s:'alil',p:0.60,minQty:50}]},
      {id:'apron_cotton',     tech:'dtf',cat:'T-Shirt & Felpe',img:'👘',name:'Grembiule Cotone DTF Cucina',    timeMin:5.5,
       suppliers:[{s:'amz',p:3.50},{s:'alil',p:1.50,minQty:24}]},

      // ═══════════════ BORSE & ACCESSORI ════════════════════════
      {id:'borsa_juta',       tech:'dtf',cat:'Borse & Accessori',img:'👜',name:'Borsa Juta Natural 38×40cm',   timeMin:4.5,
       suppliers:[{s:'cpl',p:1.20},{s:'amz',p:1.45,minQty:10},{s:'alil',p:0.50,minQty:50}]},
      {id:'pochette_sub',     tech:'sublimazione',cat:'Borse & Accessori',img:'👛',name:'Pochette Neoprene Sub 20×15cm',timeMin:3.5,
       suppliers:[{s:'sub',p:2.20},{s:'alil',p:0.85,minQty:24}]},
      {id:'zaino_sub',        tech:'sublimazione',cat:'Borse & Accessori',img:'🎒',name:'Zainetto Poliestere Sub 30×40cm',timeMin:4.5,
       suppliers:[{s:'sub',p:4.50},{s:'alil',p:1.80,minQty:12}]},

      // ═══════════════ CAPPELLI ══════════════════════════════════
      {id:'cappello_bambu',   tech:'laser',cat:'Cappelli',img:'🧢',name:'Cappellino Baseball Cotone',          timeMin:2.5,
       suppliers:[{s:'word',p:3.80},{s:'alil',p:1.50,minQty:24}]},
      {id:'berretto_dtf',     tech:'dtf',cat:'Cappelli',img:'🎩',name:'Berretto Invernale Acrilico DTF',       timeMin:3.5,
       suppliers:[{s:'word',p:2.90},{s:'alil',p:1.20,minQty:24}]},

      // ═══════════════ SPECIALI ══════════════════════════════════
      {id:'bottiglia_vino_sub',tech:'sublimazione',cat:'Speciali',img:'🍷',name:'Borsa Porta Vino Sub',        timeMin:5.0,
       suppliers:[{s:'sub',p:3.80},{s:'alil',p:1.50,minQty:12}]},
      {id:'foto_ceramica',    tech:'sublimazione',cat:'Speciali',img:'🏺',name:'Piastrella Ceramica Foto 10×10',timeMin:4.0,
       suppliers:[{s:'sub',p:1.80},{s:'alil',p:0.70,minQty:24}]},
      {id:'ardesia_laser',    tech:'laser',cat:'Speciali',img:'🪨',name:'Tavoletta Ardesia Laser 15×10cm',     timeMin:3.5,
       suppliers:[{s:'amz',p:2.20},{s:'alil',p:0.80,minQty:24}]},
      {id:'mattone_laser',    tech:'laser',cat:'Speciali',img:'🧱',name:'Mattone Decorativo Laser 12×5cm',     timeMin:4.0,
       suppliers:[{s:'amz',p:1.80},{s:'alil',p:0.65,minQty:24}]},
    ];

    // ── Compute costSup from best supplier price ──────────────
    CATALOG_V33.forEach(function(p){
      if(p.suppliers&&p.suppliers.length){
        var best=p.suppliers.reduce(function(a,b){return b.p<a.p?b:a;},p.suppliers[0]);
        p.costSup = parseFloat(best.p)||0;
        p.cost    = parseFloat(best.p)||0;
        // Best direct supplier (non-alibaba for default display)
        var nonAli=p.suppliers.filter(function(s){return s.s!=='alil';});
        var bestDirect=nonAli.length?nonAli.reduce(function(a,b){return b.p<a.p?b:a;},nonAli[0]):best;
        var supInfo=SUPS[bestDirect.s]||{name:bestDirect.s,url:''};
        p.sup=supInfo.name;
        p.url=supInfo.url;
        p.supsBest=best;
      }
    });

    // Replace catalog
    LaserB2B._PRODUCTS = CATALOG_V33;
    // Save to localStorage
    try{ localStorage.setItem('lb2b_catalog_v33', JSON.stringify(CATALOG_V33)); }catch(e){}

    // ── Patch _selectProd32 to show multi-supplier comparison ─
    var _origSelect=LaserB2B._selectProd32?.bind(LaserB2B);
    if(_origSelect){
      LaserB2B._selectProd32=function(id){
        _origSelect(id);
        // After render, inject supplier comparison panel
        setTimeout(function(){
          var calcEl=document.getElementById('lb2b-calc32');
          if(!calcEl) return;
          var prod=LaserB2B._selProduct;
          if(!prod||!prod.suppliers||!prod.suppliers.length) return;
          var old=document.getElementById('lb2b-sup-panel');
          if(old) old.remove();
          var panel=document.createElement('div');
          panel.id='lb2b-sup-panel';
          panel.style.cssText='background:rgba(16,185,129,.04);border:1.5px solid rgba(16,185,129,.2);border-radius:12px;padding:12px;margin-bottom:10px';
          var rows=prod.suppliers.map(function(s){
            var si=SUPS[s.s]||{name:s.s,url:'#',note:''};
            var isBest=s.p===prod.costSup;
            return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
              +'<div style="width:6px;height:6px;border-radius:50%;background:'+(isBest?'#22c55e':'#334155')+';flex-shrink:0"></div>'
              +'<a href="'+si.url+'" target="_blank" style="font-size:11px;font-weight:'+(isBest?'800':'600')+';color:'+(isBest?'#22c55e':'var(--text)')+';text-decoration:none;flex:1">'+si.name+'</a>'
              +(s.minQty?'<span style="font-size:9px;color:#64748b">min '+s.minQty+'pz</span>':'')
              +'<span style="font-size:13px;font-weight:900;color:'+(isBest?'#22c55e':'var(--text-muted)')+'">€'+s.p.toFixed(2)+'</span>'
              +(isBest?'<span style="font-size:9px;background:#22c55e20;color:#22c55e;padding:1px 6px;border-radius:10px;font-weight:700">MIGLIOR</span>':'')
              +'</div>';
          }).join('');
          panel.innerHTML='<div style="font-size:10px;font-weight:800;color:#10b981;margin-bottom:8px;display:flex;align-items:center;gap:6px">'
            +'🏪 Confronto Fornitori ('+prod.suppliers.length+')'
            +'<span style="font-size:9px;font-weight:400;color:var(--text-dim)">Click fornitore → apre sito</span>'
            +'</div>'+rows;
          // Insert before the cost breakdown
          var costBox=calcEl.querySelector('[style*="Costi per pezzo"]');
          if(costBox) costBox.parentElement.insertBefore(panel,costBox.parentElement.firstChild.nextSibling.nextSibling);
          else calcEl.insertBefore(panel,calcEl.firstChild.nextSibling);
        },150);
      };
    }

    // ── Patch render prod list to show best price and supplier ─
    var _origRender=LaserB2B._renderProdList32?.bind(LaserB2B);
    if(_origRender){
      LaserB2B._renderProdList32=function(prods,techFilter){
        var inner=document.getElementById('lb2b-prod-list32'); if(!inner) return;
        var cats=[...new Set(prods.map(function(p){return p.cat;}))];
        var filtered=techFilter?prods.filter(function(p){return p.tech===techFilter;}):prods;
        var html='';
        cats.forEach(function(cat){
          var items=filtered.filter(function(p){return p.cat===cat;});
          if(!items.length) return;
          var TC={laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'};
          html+='<div style="padding:5px 10px;font-size:9px;font-weight:800;color:var(--text-muted);text-transform:uppercase;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);position:sticky;top:0;display:flex;align-items:center;justify-content:space-between">'
            +'<span>'+cat+'</span>'
            +'<span style="font-size:8px;color:var(--text-dim)">'+items.length+' prodotti</span></div>';
          items.forEach(function(p){
            var col=TC[p.tech||'laser']||'#6366f1';
            var nsup=(p.suppliers||[]).length;
            var aliPrice=p.suppliers?(p.suppliers.find(function(s){return s.s==='alil';})?.p||null):null;
            html+='<button id="lb2b-btn-'+p.id+'" onclick="LaserB2B._selectProd32(\''+p.id+'\')" '
              +'style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;text-align:left;transition:.12s" '
              +'onmouseover="if(!this.classList.contains(\'sel\'))this.style.background=\'var(--bg-card)\'" '
              +'onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">'
              +'<span style="font-size:16px">'+p.img+'</span>'
              +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>'
              +'<div style="font-size:9px;display:flex;gap:5px;align-items:center;margin-top:1px;flex-wrap:wrap">'
              +'<span style="background:'+col+'20;color:'+col+';padding:0 4px;border-radius:8px">'+( p.tech||'laser')+'</span>'
              +'<span style="color:#10b981;font-weight:700">€'+(p.costSup||0).toFixed(2)+'</span>'
              +(nsup>1?'<span style="color:var(--text-dim)">'+nsup+' fornitori</span>':'')
              +(aliPrice?'<span style="color:#64748b">Alibaba €'+aliPrice.toFixed(2)+'</span>':'')
              +'</div></div>'
              +'</button>';
          });
        });
        inner.innerHTML=html||'<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Nessun prodotto</div>';
      };
    }

    // Refresh LaserB2B if it's the active view
    setTimeout(function(){
      var el=document.getElementById('view-laser_b2b');
      if(el&&el.classList.contains('active')&&typeof LaserB2B.render==='function') LaserB2B.render();
    },300);

    console.log('[LaserB2B v33] Catalogo aggiornato: '+CATALOG_V33.length+' prodotti · multi-fornitore');
    if(typeof toast!=='undefined') setTimeout(function(){
      toast('🛒 Catalogo B2B aggiornato: '+CATALOG_V33.length+' prodotti · multi-fornitore','success');
    },2000);
  }
  setTimeout(_p,1200);
})();


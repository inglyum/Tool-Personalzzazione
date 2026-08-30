
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v23 — Laser B2B Pro: Catalogo completo + CRUD + UI Pro
// ═══════════════════════════════════════════════════════════════════
;(function _laserB2BV23(){

// ─── PRODOTTO SCHEMA ─────────────────────────────────────────────
// {id, tech, cat, img, name, costSup, timeMin, sup, url, notes}
// tech: 'laser' | 'sublimazione' | 'dtf' | 'laser+sub'

var CATALOG_SK  = 'lb2b_catalog_v23';
var STOCK_SK    = 'lb2b_stock_v1';
var QUOTES_SK   = 'lb2b_quotes_v1';

// ─── DATABASE COMPLETO ───────────────────────────────────────────
var DEFAULT_CATALOG = [

  // ═══════════════ LASER — PORTACHIAVI ══════════════════════════
  {id:'pk_bambu_rot35',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø35mm',          costSup:0.32,timeMin:1.2,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-bambu'},
  {id:'pk_bambu_rot40',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø40mm',          costSup:0.38,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-bambu'},
  {id:'pk_bambu_rot50',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rotondo Ø50mm',          costSup:0.55,timeMin:1.8,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-bambu'},
  {id:'pk_bambu_ret_s',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rettangolare 50×25mm',   costSup:0.38,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_ret_m',  tech:'laser',cat:'Portachiavi',img:'🎋',name:'Portachiavi Bambù Rettangolare 65×30mm',   costSup:0.45,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_cuore',  tech:'laser',cat:'Portachiavi',img:'❤️',name:'Portachiavi Bambù Cuore',                  costSup:0.88,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_casa',   tech:'laser',cat:'Portachiavi',img:'🏠',name:'Portachiavi Bambù Forma Casa',             costSup:0.85,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_stella', tech:'laser',cat:'Portachiavi',img:'⭐',name:'Portachiavi Bambù Stella 5 punte',         costSup:0.90,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_auto',   tech:'laser',cat:'Portachiavi',img:'🚗',name:'Portachiavi Bambù Forma Auto',             costSup:0.95,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_farfalla',tech:'laser',cat:'Portachiavi',img:'🦋',name:'Portachiavi Bambù Farfalla',              costSup:0.90,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_ancora', tech:'laser',cat:'Portachiavi',img:'⚓',name:'Portachiavi Bambù Ancora Nautica',         costSup:0.88,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_cane',   tech:'laser',cat:'Portachiavi',img:'🐶',name:'Portachiavi Bambù Zampa Cane/Gatto',      costSup:0.90,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_mela',   tech:'laser',cat:'Portachiavi',img:'🍎',name:'Portachiavi Bambù Mela (Teacher)',         costSup:0.95,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_mandala',tech:'laser',cat:'Portachiavi',img:'🌸',name:'Portachiavi Bambù Mandala Ø50mm',         costSup:0.95,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_bambu_albero', tech:'laser',cat:'Portachiavi',img:'🌳',name:'Portachiavi Bambù Albero della Vita',      costSup:0.98,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_faggio_rot',   tech:'laser',cat:'Portachiavi',img:'🪵',name:'Portachiavi Faggio Rotondo Ø40mm',         costSup:0.52,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_faggio_ret',   tech:'laser',cat:'Portachiavi',img:'🪵',name:'Portachiavi Faggio Rettangolare 60×25mm',  costSup:0.58,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_noce',         tech:'laser',cat:'Portachiavi',img:'🌰',name:'Portachiavi Noce Premium Ø45mm',           costSup:1.20,timeMin:1.8,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_mdf_ret',      tech:'laser',cat:'Portachiavi',img:'🟫',name:'Portachiavi MDF Rettangolare 50×25mm',     costSup:0.28,timeMin:1.2,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_inox_rot',     tech:'laser',cat:'Portachiavi',img:'⚙️',name:'Portachiavi Inox Rotondo Ø30mm Lucido',   costSup:1.20,timeMin:2.5,sup:'higift.it',url:'https://www.higift.it'},
  {id:'pk_inox_ret',     tech:'laser',cat:'Portachiavi',img:'⚙️',name:'Portachiavi Inox Rettangolare 55×25mm',   costSup:1.35,timeMin:2.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'pk_inox_bicolor', tech:'laser',cat:'Portachiavi',img:'✨',name:'Portachiavi Inox Bicolore Oro/Silver',     costSup:0.76,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'pk_inox_tag',     tech:'laser',cat:'Portachiavi',img:'🏷️',name:'Portachiavi Tag Inox 50×20mm',            costSup:0.65,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'pk_inox_ovale',   tech:'laser',cat:'Portachiavi',img:'⭕',name:'Portachiavi Inox Ovale 45×30mm',           costSup:1.10,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_allum_col',    tech:'laser',cat:'Portachiavi',img:'🎨',name:'Portachiavi Alluminio Colorato Ø60mm',     costSup:0.83,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'pk_allum_anod',   tech:'laser',cat:'Portachiavi',img:'🔲',name:'Portachiavi Alluminio Anodizzato Nero',    costSup:0.92,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'pk_plexi_tr',     tech:'laser',cat:'Portachiavi',img:'💎',name:'Portachiavi Plexiglass Trasparente Ø50mm', costSup:0.80,timeMin:2.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'pk_plexi_oro',    tech:'laser',cat:'Portachiavi',img:'💛',name:'Portachiavi Plexiglass Specchiato Oro',    costSup:1.50,timeMin:2.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'pk_plexi_silver', tech:'laser',cat:'Portachiavi',img:'🪙',name:'Portachiavi Plexiglass Specchiato Silver', costSup:1.40,timeMin:2.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'pk_plexi_rosa',   tech:'laser',cat:'Portachiavi',img:'🌸',name:'Portachiavi Plexiglass Rosa Fluo',         costSup:1.20,timeMin:2.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'pk_sughero',      tech:'laser',cat:'Portachiavi',img:'🌿',name:'Portachiavi Sughero FSC Ø40mm',            costSup:0.75,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_pelle_nat',    tech:'laser',cat:'Portachiavi',img:'🐄',name:'Portachiavi Pelle Naturale Tag 50×25mm',   costSup:2.50,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'pk_fibra_bambu',  tech:'laser',cat:'Portachiavi',img:'🌱',name:'Portachiavi Fibra Bambù+Plastica Bio 45mm',costSup:0.55,timeMin:1.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ LASER — PENNE & MATITE ═══════════════════════
  {id:'penna_bambu',     tech:'laser',cat:'Penne & Matite',img:'✏️',name:'Penna Bambù Naturale Bio',             costSup:0.95,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'penna_bambu_set', tech:'laser',cat:'Penne & Matite',img:'✏️',name:'Set 2 Penne Bambù + Astuccio',         costSup:2.20,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'penna_met_arg',   tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Penna Metallo Silver Laser-Ready',    costSup:1.80,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'penna_met_oro',   tech:'laser',cat:'Penne & Matite',img:'✒️',name:'Penna Metallo Oro Rosa Premium',       costSup:2.20,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'penna_met_nero',  tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Penna Metallo Nero Opaco Business',   costSup:1.95,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'penna_allum',     tech:'laser',cat:'Penne & Matite',img:'✒️',name:'Penna Alluminio Touch Stylus 3in1',    costSup:1.50,timeMin:2.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'matita_grafite',  tech:'laser',cat:'Penne & Matite',img:'✏️',name:'Matita Grafite Triangolare Incidibile', costSup:0.45,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'set_penna_mat',   tech:'laser',cat:'Penne & Matite',img:'🖋️',name:'Set Penna+Matita Legno in Scatola',   costSup:3.20,timeMin:4.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'penna_roller',    tech:'laser',cat:'Penne & Matite',img:'🖊️',name:'Roller Metallo Premium Laser Engraved', costSup:3.50,timeMin:3.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ LASER — TARGHE & PLACCHE ═════════════════════
  {id:'tg_bambu_s',      tech:'laser',cat:'Targhe & Placche',img:'🏷️',name:'Targhetta Bambù 60×30mm con foro',  costSup:0.30,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tg_bambu_m',      tech:'laser',cat:'Targhe & Placche',img:'🏷️',name:'Targhetta Bambù 90×50mm desk',     costSup:0.65,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tg_bambu_grande', tech:'laser',cat:'Targhe & Placche',img:'🏷️',name:'Targhetta Bambù 150×80mm premium', costSup:1.20,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tg_inox_s',       tech:'laser',cat:'Targhe & Placche',img:'🔩',name:'Placca Inox 80×50mm lucida',        costSup:0.60,timeMin:3.0,sup:'higift.it',url:'https://www.higift.it'},
  {id:'tg_inox_m',       tech:'laser',cat:'Targhe & Placche',img:'🔩',name:'Placca Inox 120×80mm professionale',costSup:1.20,timeMin:4.0,sup:'higift.it',url:'https://www.higift.it'},
  {id:'tg_inox_batt',    tech:'laser',cat:'Targhe & Placche',img:'🔑',name:'Targhetta Battesimo Inox 90×60mm',  costSup:1.50,timeMin:4.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'tg_allum_adesiva',tech:'laser',cat:'Targhe & Placche',img:'🔖',name:'Targa Alluminio Adesiva 100×50mm',  costSup:0.50,timeMin:2.5,sup:'higift.it',url:'https://www.higift.it'},
  {id:'tg_legno_uff',    tech:'laser',cat:'Targhe & Placche',img:'🗒️',name:'Targhetta Legno Ufficio 120×50mm',  costSup:1.50,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tg_acrilico',     tech:'laser',cat:'Targhe & Placche',img:'💎',name:'Targa Acrilico Trasparente 150×60mm',costSup:1.80,timeMin:3.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'tg_porta_nome',   tech:'laser',cat:'Targhe & Placche',img:'🏢',name:'Targhetta Porta Nome Desk 180×50mm',costSup:1.20,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ LASER — MEDAGLIE & PREMI ═════════════════════
  {id:'med_allum_50',    tech:'laser',cat:'Medaglie & Premi',img:'🏅',name:'Medaglia Alluminio Ø50mm + nastrino', costSup:1.50,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'med_allum_70',    tech:'laser',cat:'Medaglie & Premi',img:'🏅',name:'Medaglia Alluminio Ø70mm trofeo',     costSup:2.20,timeMin:3.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'med_inox_50',     tech:'laser',cat:'Medaglie & Premi',img:'🥇',name:'Medaglia Inox Ø50mm premium',        costSup:2.80,timeMin:3.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'trofeo_legno_s',  tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Legno MDF 150×80mm con base', costSup:2.80,timeMin:5.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'trofeo_legno_m',  tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Legno MDF 200×120mm grande',  costSup:4.50,timeMin:7.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'trofeo_plexi',    tech:'laser',cat:'Medaglie & Premi',img:'🏆',name:'Trofeo Plexiglass Cristallo 150mm',  costSup:3.80,timeMin:5.0,sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
  {id:'attestato_bambu', tech:'laser',cat:'Medaglie & Premi',img:'📜',name:'Attestato Bambù A5 con supporto',    costSup:3.20,timeMin:6.0,sup:'gadget365.it',url:'https://www.gadget365.it'},

  // ═══════════════ LASER — GADGET DA TAVOLO ═════════════════════
  {id:'tagliere_bambu_s',tech:'laser',cat:'Gadget Cucina',img:'🍽️',name:'Tagliere Bambù S 20×15cm',             costSup:2.50,timeMin:5.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tagliere_bambu_m',tech:'laser',cat:'Gadget Cucina',img:'🍽️',name:'Tagliere Bambù M 30×20cm',             costSup:3.80,timeMin:6.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tagliere_bambu_l',tech:'laser',cat:'Gadget Cucina',img:'🍽️',name:'Tagliere Bambù L 40×25cm',             costSup:5.50,timeMin:7.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'tagliere_cuore',  tech:'laser',cat:'Gadget Cucina',img:'❤️',name:'Tagliere Bambù Cuore 25×22cm regalo',  costSup:4.20,timeMin:6.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'sottobicchiere_r',tech:'laser',cat:'Gadget Cucina',img:'☕',name:'Sottobicchiere Bambù Rotondo Ø10cm',    costSup:0.48,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'sottobicchiere_q',tech:'laser',cat:'Gadget Cucina',img:'☕',name:'Sottobicchiere Bambù Quadrato 10×10cm', costSup:0.52,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'set_sottobicch',  tech:'laser',cat:'Gadget Cucina',img:'☕',name:'Set 4 Sottobicchieri Bambù + Porta',    costSup:3.80,timeMin:5.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'portapenne_bambu',tech:'laser',cat:'Gadget Cucina',img:'✏️',name:'Portapenne Bambù Cilindrico Ø8cm',     costSup:1.80,timeMin:4.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'posacenere',      tech:'laser',cat:'Gadget Cucina',img:'🌙',name:'Posacenere Bambù Rotondo incidibile',   costSup:1.20,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'vassoio_bambu',   tech:'laser',cat:'Gadget Cucina',img:'🍱',name:'Vassoio Bambù 35×25cm con manici',     costSup:4.80,timeMin:6.0,sup:'gadget365.it',url:'https://www.gadget365.it'},

  // ═══════════════ LASER — GADGET UFFICIO/TECH ══════════════════
  {id:'usb_bambu_8',     tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB 8GB Bambù Flat',           costSup:3.20,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'usb_bambu_16',    tech:'laser',cat:'USB & Tech',img:'💾',name:'Chiavetta USB 16GB Bambù/Legno',         costSup:4.50,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'usb_metallo_16',  tech:'laser',cat:'USB & Tech',img:'🖥️',name:'Chiavetta USB 16GB Metallo Premium',     costSup:5.80,timeMin:3.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'mouse_pad_bambu', tech:'laser',cat:'USB & Tech',img:'🖱️',name:'Mouse Pad Bambù 220×180mm antiscivolo',  costSup:2.80,timeMin:4.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'caricatore_bambu',tech:'laser',cat:'USB & Tech',img:'🔋',name:'Caricatore Wireless Bambù 10W Qi',       costSup:7.50,timeMin:4.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'cavo_bambu',      tech:'laser',cat:'USB & Tech',img:'🔌',name:'Cavo USB-C Bambu 1m con logo inciso',    costSup:2.20,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'notebook_bambu',  tech:'laser',cat:'USB & Tech',img:'📓',name:'Notebook Copertina Bambù A5 80 pag',     costSup:3.50,timeMin:5.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'notebook_legno',  tech:'laser',cat:'USB & Tech',img:'📒',name:'Notebook Copertina Legno A5 Premium',    costSup:4.20,timeMin:5.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'segnalibro_bambu',tech:'laser',cat:'USB & Tech',img:'🔖',name:'Segnalibro Bambù 150×25mm personalizzato',costSup:0.38,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},

  // ═══════════════ LASER — BRACCIALI & GIOIELLI ═════════════════
  {id:'bracciale_bambu', tech:'laser',cat:'Bracciali & Gioielli',img:'💚',name:'Bracciale Bambù Piatto 180×15mm',   costSup:0.65,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'bracciale_allum', tech:'laser',cat:'Bracciali & Gioielli',img:'💙',name:'Bracciale Alluminio Anodizzato 20mm',costSup:1.20,timeMin:2.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'bracciale_inox',  tech:'laser',cat:'Bracciali & Gioielli',img:'⚪',name:'Bracciale Inox Lucido Incidibile',   costSup:2.20,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'anello_acciaio',  tech:'laser',cat:'Bracciali & Gioielli',img:'💍',name:'Anello Acciaio Inox Personalizzato',  costSup:1.80,timeMin:4.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'ciondolo_inox',   tech:'laser',cat:'Bracciali & Gioielli',img:'📿',name:'Ciondolo Inox Rotondo Ø30mm',         costSup:0.95,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'spilla_bambu',    tech:'laser',cat:'Bracciali & Gioielli',img:'📌',name:'Spilla Bambù Rotonda Ø30mm',          costSup:0.55,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'spilla_metallo',  tech:'laser',cat:'Bracciali & Gioielli',img:'📌',name:'Spilla Metallo Smaltata Ø25mm',       costSup:0.80,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ LASER — CALAMITE ═════════════════════════════
  {id:'calamita_bambu',  tech:'laser',cat:'Calamite',img:'🧲',name:'Calamita Bambù Rettangolare 70×40mm',     costSup:0.55,timeMin:1.8,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'calamita_legno',  tech:'laser',cat:'Calamite',img:'🧲',name:'Calamita Legno Rotonda Ø55mm',            costSup:0.60,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'calamita_inox',   tech:'laser',cat:'Calamite',img:'🔗',name:'Calamita Inox Premium 60×30mm',           costSup:1.20,timeMin:2.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ LASER — BOMBONIERE ═══════════════════════════
  {id:'bomb_bambu_cuore',tech:'laser',cat:'Bomboniere',img:'🎀',name:'Bomboniera Scatolina Bambù Cuore',       costSup:1.50,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'bomb_calamita',   tech:'laser',cat:'Bomboniere',img:'🎀',name:'Bomboniera Calamita+Cornicina Legno',    costSup:1.20,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'bomb_segnalibro', tech:'laser',cat:'Bomboniere',img:'🎀',name:'Bomboniera Segnalibro Bambù 150mm',      costSup:0.60,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'bomb_pk_bambu',   tech:'laser',cat:'Bomboniere',img:'🎀',name:'Bomboniera Portachiavi Bambù in Sacchetto',costSup:0.95,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'bomb_vasetto',    tech:'laser',cat:'Bomboniere',img:'🫙',name:'Vasetto Vetro+Coperchio Legno Inciso',    costSup:1.80,timeMin:3.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
  {id:'bomb_candela',    tech:'laser',cat:'Bomboniere',img:'🕯️',name:'Candela in Vasetto con Etichetta Laser',  costSup:2.50,timeMin:2.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ SUBLIMAZIONE — BEVANDE ══════════════════════
  {id:'tazza_bianca_11', tech:'sublimazione',cat:'Tazze & Bevande',img:'☕',name:'Tazza Ceramica Bianca 11oz',       costSup:1.47,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'tazza_bianca_15', tech:'sublimazione',cat:'Tazze & Bevande',img:'☕',name:'Tazza Ceramica Bianca 15oz XL',    costSup:1.85,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'tazza_colorata',  tech:'sublimazione',cat:'Tazze & Bevande',img:'🌈',name:'Tazza Ceramica Interno Colorato 11oz',costSup:1.75,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'tazza_cuore',     tech:'sublimazione',cat:'Tazze & Bevande',img:'❤️',name:'Tazza Ceramica Forma Cuore 11oz',   costSup:2.20,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'tazza_magica',    tech:'sublimazione',cat:'Tazze & Bevande',img:'✨',name:'Tazza Magica Cambia Colore 11oz',    costSup:2.50,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'borraccia_allum', tech:'sublimazione',cat:'Tazze & Bevande',img:'🍶',name:'Borraccia Alluminio 500ml Sub',      costSup:2.80,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'travel_mug',      tech:'sublimazione',cat:'Tazze & Bevande',img:'🥤',name:'Travel Mug Acciaio 450ml Sub',       costSup:3.50,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'bottiglia_vetro', tech:'sublimazione',cat:'Tazze & Bevande',img:'🍾',name:'Bottiglia Vetro 500ml Sub-Ready',    costSup:3.20,timeMin:0.5,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},

  // ═══════════════ SUBLIMAZIONE — ARREDO & FOTO ═════════════════
  {id:'cuscino_40',      tech:'sublimazione',cat:'Arredo & Foto',img:'🛋️',name:'Cuscino Poliestere 40×40cm Sub',      costSup:2.10,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'cuscino_cuore',   tech:'sublimazione',cat:'Arredo & Foto',img:'❤️',name:'Cuscino Cuore Poliestere 30×30cm',     costSup:2.80,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'puzzle_120',      tech:'sublimazione',cat:'Arredo & Foto',img:'🧩',name:'Puzzle 30×42cm 120pz Sub',             costSup:2.90,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'puzzle_300',      tech:'sublimazione',cat:'Arredo & Foto',img:'🧩',name:'Puzzle 42×28cm 300pz Sub',             costSup:4.20,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'pannello_mdf_a4', tech:'sublimazione',cat:'Arredo & Foto',img:'🖼️',name:'Pannello MDF Bianco A4 Sub/Laser',    costSup:1.20,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'pannello_mdf_a3', tech:'sublimazione',cat:'Arredo & Foto',img:'🖼️',name:'Pannello MDF Bianco A3 Sub/Laser',    costSup:2.20,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'cornice_legno',   tech:'laser',cat:'Arredo & Foto',img:'🖼️',name:'Cornice Legno 10×15cm con incisione',      costSup:2.50,timeMin:4.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'cornice_bambu',   tech:'laser',cat:'Arredo & Foto',img:'🎋',name:'Cornice Bambù 13×18cm personalizzata',     costSup:3.20,timeMin:4.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'calamita_sub',    tech:'sublimazione',cat:'Calamite',img:'🧲',name:'Calamita Rotonda Ø55mm Sub-Ready',       costSup:0.45,timeMin:0.3,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'calamita_sub_ret',tech:'sublimazione',cat:'Calamite',img:'🧲',name:'Calamita Rettangolare 80×55mm Sub',       costSup:0.65,timeMin:0.3,sup:'sublimet.com',url:'https://www.sublimet.com'},

  // ═══════════════ DTF — ABBIGLIAMENTO & TESSILI ════════════════
  {id:'tshirt_bianca_m', tech:'dtf',cat:'T-Shirt',img:'👕',name:'T-Shirt Bianca 100% Cotone M',               costSup:2.20,timeMin:0.8,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'tshirt_bianca_l', tech:'dtf',cat:'T-Shirt',img:'👕',name:'T-Shirt Bianca 100% Cotone L',               costSup:2.20,timeMin:0.8,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'tshirt_nera_m',   tech:'dtf',cat:'T-Shirt',img:'🖤',name:'T-Shirt Nera Premium 190g/m² M',             costSup:2.80,timeMin:0.8,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'tshirt_col',      tech:'dtf',cat:'T-Shirt',img:'🌈',name:'T-Shirt Colorata Varie Taglie',               costSup:2.50,timeMin:0.8,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'felpa_bianca',    tech:'dtf',cat:'Felpe',img:'🧥',name:'Felpa Crewneck Bianca 280g S-XL',              costSup:5.50,timeMin:1.0,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'felpa_cappuccio', tech:'dtf',cat:'Felpe',img:'🧥',name:'Felpa con Cappuccio Unisex 300g',              costSup:7.20,timeMin:1.0,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'polo_pique',      tech:'dtf',cat:'Polo',img:'🏌️',name:'Polo Piqué 100% Cotone Business M-XL',         costSup:4.50,timeMin:1.0,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'shopper_cot',     tech:'dtf',cat:'Borse & Accessori',img:'👜',name:'Shopper Cotton Canvas 38×42cm',     costSup:1.80,timeMin:0.8,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'zaino_bambini',   tech:'dtf',cat:'Borse & Accessori',img:'🎒',name:'Zainetto Bambini Sub/DTF 25×30cm',  costSup:3.20,timeMin:0.8,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'cappellino_5p',   tech:'dtf',cat:'Cappelli',img:'🧢',name:'Cappellino 5 Panel Cotone con visiera',      costSup:2.50,timeMin:0.5,sup:'wordans.it',url:'https://www.wordans.it'},
  {id:'bandana_sub',     tech:'sublimazione',cat:'Cappelli',img:'🎀',name:'Bandana Poliestere 50×50cm Sub',    costSup:0.90,timeMin:0.5,sup:'sublimet.com',url:'https://www.sublimet.com'},

  // ═══════════════ MULTIPLA — LASER+SUB ════════════════════════
  {id:'bottiglia_sub_lg',tech:'laser+sub',cat:'Special',img:'🍾',name:'Bottiglia Alluminio 650ml Laser+Sub',   costSup:4.20,timeMin:1.0,sup:'sublimet.com',url:'https://www.sublimet.com'},
  {id:'set_regalo_pk',   tech:'laser+sub',cat:'Special',img:'🎁',name:'Set Regalo: Tazza+Portachiavi Bambù',  costSup:3.50,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'cofanetto_bambu', tech:'laser',    cat:'Special',img:'📦',name:'Cofanetto Bambù 15×10×5cm con incisione',costSup:3.80,timeMin:5.0,sup:'gadget365.it',url:'https://www.gadget365.it'},
  {id:'box_legno',       tech:'laser',    cat:'Special',img:'📦',name:'Scatola Legno 20×12×6cm con logo',      costSup:4.50,timeMin:5.0,sup:'gadget48.com',url:'https://www.gadget48.com/incisione-laser'},
];

// ─── LaserB2B PRO v23 ─────────────────────────────────────────────
function init(){
  if(typeof LaserB2B==='undefined'){ setTimeout(init,600); return; }
  if(LaserB2B._v23) return;
  LaserB2B._v23=true;

  // Load/init catalog
  var saved=localStorage.getItem(CATALOG_SK);
  if(saved){ try{ LaserB2B._PRODUCTS=JSON.parse(saved); }catch(e){ LaserB2B._PRODUCTS=DEFAULT_CATALOG.slice(); } }
  else{ LaserB2B._PRODUCTS=DEFAULT_CATALOG.slice(); saveCatalog(); }
  console.log('[B2B v23] Catalog: '+LaserB2B._PRODUCTS.length+' products');

  // Patch render() for tech+cat filter
  var _origRender = LaserB2B.render.bind(LaserB2B);
  LaserB2B.render = function(){
    var el=document.getElementById('view-laser_b2b'); if(!el) return;
    el.innerHTML=buildUI();
  };

  // Patch calc() for admin panel
  if(!LaserB2B._calcPatched23){
    LaserB2B._calcPatched23=true;
    var _origCalc=LaserB2B.calc?.bind(LaserB2B);
    if(_origCalc){
      LaserB2B.calc=function(){
        _origCalc();
        drawAdminPanel();
      };
    }
  }
}

function saveCatalog(){ try{ localStorage.setItem(CATALOG_SK,JSON.stringify(LaserB2B._PRODUCTS)); }catch(e){} }

function getTechColor(tech){
  return {laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'}[tech]||'#6366f1';
}
function getTechLabel(tech){
  return {laser:'⚡ Laser',sublimazione:'🌈 Sub',dtf:'🎨 DTF','laser+sub':'✨ Multi'}[tech]||tech;
}

function buildUI(){
  var prods=LaserB2B._PRODUCTS||DEFAULT_CATALOG;
  var techs=[...new Set(prods.map(function(p){return p.tech;}))];
  var allCats=[...new Set(prods.map(function(p){return p.cat;}))];

  // Machines config row
  var machineOpts=Object.entries(LaserB2B._MACHINES||{}).map(function(kv){
    var k=kv[0],m=kv[1];
    return '<option value="'+k+'">'+m.icon+' '+m.label+'</option>';
  }).join('');

  var H='<div style="padding:16px 20px;max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    +'<span style="font-size:26px">💼</span>'
    +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">Laser Quoter B2B</div>'
    +'<div style="font-size:11px;color:var(--text-muted)">'+prods.length+' prodotti · Calcolo costi + margini in tempo reale</div></div>'
    +'<div style="margin-left:auto;display:flex;gap:8px">'    +'<button onclick="LaserB2B.openMachineManager()" style="padding:8px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">⚙️ Macchine</button>'    +'<button onclick="LaserB2B._openCatalogManager()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">📋 Gestisci Catalogo</button>'    +'</div>'
    +'</div>'
    // Config row
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">'
    +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">⚡ Macchina</label>'
    +'<select id="lb2b-machine" onchange="LaserB2B.calc&&LaserB2B.calc()" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'+machineOpts+'</select></div>'
    +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">🎯 Canale</label>'
    +'<select id="lb2b-channel" onchange="LaserB2B.calc&&LaserB2B.calc()" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
    +'<option value="b2b">B2B Aziende ×2.0</option><option value="etsy">Etsy ×3.5</option><option value="retail">Retail ×3.0</option></select></div>'
    +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">👷 Lavoro €/h</label>'
    +'<input id="lb2b-labor" type="number" value="18" onchange="LaserB2B.calc&&LaserB2B.calc()" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
    +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">📦 Pack €/pz</label>'
    +'<input id="lb2b-pack" type="number" value="0.30" step="0.05" onchange="LaserB2B.calc&&LaserB2B.calc()" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
    +'</div>'
    // Magazzino btn
    +'<button onclick="LaserB2B.openStockManager&&LaserB2B.openStockManager()" style="width:100%;padding:8px;background:rgba(16,185,129,.08);color:#10b981;border:1px solid rgba(16,185,129,.2);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:6px">📦 Gestisci Magazzino Interno</button>'
    // Search + filter
    +'<div style="display:flex;gap:8px;margin-bottom:12px">'
    +'<input id="lb2b-search" oninput="renderB2BProducts()" placeholder="🔍 Cerca prodotto..." style="flex:1;padding:9px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
    +'<select id="lb2b-filter-tech" onchange="renderB2BProducts()" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
    +'<option value="">Tutte le tecniche</option>'
    +techs.map(function(t){return '<option value="'+t+'">'+getTechLabel(t)+'</option>';}).join('')
    +'</select>'
    +'<select id="lb2b-filter-cat" onchange="renderB2BProducts()" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
    +'<option value="">Tutte le categorie</option>'
    +allCats.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('')
    +'</select>'
    +'</div>'
    // Grid
    +'<div style="display:grid;grid-template-columns:1fr 2fr;gap:16px">'
    +'<div id="lb2b-product-list" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden;max-height:70vh;overflow-y:auto">'
    +'<div style="padding:10px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text-muted);display:flex;justify-content:space-between"><span>Prodotti</span><span id="lb2b-count">'+prods.length+'</span></div>'
    +'<div id="lb2b-prod-inner"></div>'
    +'</div>'
    +'<div id="lb2b-calc" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:20px">'
    +'<div style="text-align:center;padding:60px 0;color:var(--text-dim)"><div style="font-size:36px;margin-bottom:10px">💼</div><div style="font-size:13px;font-weight:700;margin-bottom:6px">Seleziona un prodotto</div><div style="font-size:11px">Clicca qualsiasi prodotto a sinistra per calcolare costi e prezzi</div></div>'
    +'</div>'
    +'</div></div>';

  return H;
}

// Called after render() to populate product list
window.renderB2BProducts = function(){
  var prods=LaserB2B._PRODUCTS||DEFAULT_CATALOG;
  var q=(document.getElementById('lb2b-search')?.value||'').toLowerCase();
  var techF=document.getElementById('lb2b-filter-tech')?.value||'';
  var catF =document.getElementById('lb2b-filter-cat')?.value||'';

  var filtered=prods.filter(function(p){
    if(techF && p.tech!==techF) return false;
    if(catF  && p.cat!==catF)   return false;
    if(q && !(p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q)||p.sup.toLowerCase().includes(q))) return false;
    return true;
  });

  var count=document.getElementById('lb2b-count');
  if(count) count.textContent=filtered.length+'/'+prods.length;

  // Group by category
  var grouped={};
  filtered.forEach(function(p){ if(!grouped[p.cat]) grouped[p.cat]=[]; grouped[p.cat].push(p); });

  var inner=document.getElementById('lb2b-prod-inner');
  if(!inner) return;

  var html='';
  Object.entries(grouped).forEach(function(kv){
    var cat=kv[0]; var items=kv[1];
    var techColor=getTechColor(items[0].tech);
    html+='<div style="padding:6px 10px;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);font-size:9px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0">'+cat+' ('+items.length+')</div>';
    items.forEach(function(p){
      var stock=LaserB2B._loadStock&&LaserB2B._loadStock()||{};
      var s=stock[p.id]||{qty:-1};
      var sColor=s.qty<0?'transparent':s.qty<=0?'#ef4444':s.qty<(s.reorder||5)?'#f59e0b':'#22c55e';
      var sBadge=s.qty<0?'':s.qty<=0?'0':''+s.qty;
      html+='<button id="lb2b-btn-'+p.id+'" onclick="LaserB2B.selectProduct(\''+p.id+'\')"'
        +' style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;text-align:left;transition:.12s"'
        +' onmouseover="this.style.background=\'var(--bg-card)\'" onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">'
        +'<span style="font-size:14px">'+p.img+'</span>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>'
        +'<div style="font-size:9px;color:var(--text-dim);display:flex;gap:6px;align-items:center">'
        +'<span style="background:'+getTechColor(p.tech)+'20;color:'+getTechColor(p.tech)+';padding:1px 5px;border-radius:10px">'+getTechLabel(p.tech)+'</span>'
        +'<span>€'+p.costSup.toFixed(2)+'</span>'
        +'<span>'+p.timeMin+'min</span>'
        +'</div></div>'
        +(sBadge?'<span style="font-size:9px;font-weight:800;color:'+sColor+'">'+sBadge+'</span>':'')
        +'</button>';
    });
  });
  inner.innerHTML=html;
};

function drawAdminPanel(){
  var d=calcData(); if(!d) return;
  var el=document.getElementById('lb2b-calc'); if(!el) return;
  var old=document.getElementById('lb2b-ap'); if(old) old.remove();
  var ap=document.createElement('div'); ap.id='lb2b-ap';
  var ov=LaserB2B._overrule>0;
  var mc=d.mg>=60?'#22c55e':d.mg>=40?'#f59e0b':'#ef4444';
  var tm=d.tm*d.qty;
  var tl=tm>=60?Math.floor(tm/60)+'h '+Math.round(tm%60)+'m':Math.round(tm)+'min';

  // Qty selector
  var qSel=document.createElement('select');
  qSel.id='lb2b-qty-sel';
  qSel.style.cssText='padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;margin-left:auto';
  (LaserB2B._QTYS||[5,10,20,50,100,200]).forEach(function(q){
    var o=document.createElement('option');
    o.value=q; o.textContent=q+' pz';
    if(q===d.qty) o.selected=true;
    qSel.appendChild(o);
  });
  qSel.onchange=function(){ LaserB2B._selQty=parseInt(this.value); drawAdminPanel(); };
  ap.style.cssText='margin-top:14px';

  var s1=document.createElement('div');
  s1.style.cssText='background:rgba(239,68,68,.06);border:1.5px solid rgba(239,68,68,.2);border-radius:14px;padding:14px;margin-bottom:12px';
  var hd=document.createElement('div');
  hd.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:12px';
  hd.innerHTML='<span style="font-size:14px">🔒</span><span style="font-size:12px;font-weight:800;color:#ef4444">ADMIN — Margini</span>';
  hd.appendChild(qSel); s1.appendChild(hd);

  var cg=document.createElement('div');
  cg.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px';
  [{l:'Materiale',v:'€'+d.mc.toFixed(2),c:'#f59e0b'},{l:'Macchina',v:'€'+d.mhc.toFixed(2),c:'#6366f1'},{l:'Lavoro',v:'€'+d.lc.toFixed(2),c:'#ec4899'},{l:'Costo/pz',v:'€'+d.cp.toFixed(2),c:'#ef4444'},{l:'Tempo tot',v:tl,c:'#64748b'}]
  .forEach(function(k){
    var cell=document.createElement('div');
    cell.style.cssText='background:var(--bg-card);border-radius:9px;padding:7px;text-align:center';
    cell.innerHTML='<div style="font-size:9px;color:'+k.c+';font-weight:700;text-transform:uppercase">'+k.l+'</div><div style="font-size:11px;font-weight:800;color:var(--text)">'+k.v+'</div>';
    cg.appendChild(cell);
  });
  s1.appendChild(cg);
  var rg=document.createElement('div'); rg.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px';
  [{l:'Prezzo '+d.qty+' pz',v:'€'+d.total.toFixed(2),c:ov?'#fbbf24':'var(--primary)',sub:ov?'⚡ OVERRULE':''},
   {l:'Profitto netto',v:'€'+d.profit.toFixed(2),c:'#22c55e',sub:'€'+(d.fp-d.cp).toFixed(2)+'/pz'},
   {l:'Margine',v:d.mg+'%',c:mc,sub:'Max sconto: -'+d.md+'%',bg:mc+'15',bd:mc+'40'}
  ].forEach(function(k){
    var cell=document.createElement('div');
    cell.style.cssText='background:'+(k.bg||'var(--bg-card)')+(k.bd?';border:1px solid '+k.bd:'')+';border-radius:9px;padding:10px;text-align:center';
    cell.innerHTML='<div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase">'+k.l+'</div><div style="font-size:18px;font-weight:900;color:'+k.c+'">'+k.v+'</div>'+(k.sub?'<div style="font-size:9px;color:var(--text-dim)">'+k.sub+'</div>':'');
    rg.appendChild(cell);
  });
  s1.appendChild(rg); ap.appendChild(s1);

  // Overrule section
  var s2=document.createElement('div');
  s2.style.cssText='background:rgba(251,191,36,.05);border:1.5px solid rgba(251,191,36,.2);border-radius:14px;padding:12px;margin-bottom:12px';
  s2.innerHTML='<div style="font-size:11px;font-weight:800;color:#fbbf24;margin-bottom:8px">⚡ Preventivo</div>';
  var fg=document.createElement('div'); fg.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:7px';
  var ci=document.createElement('div'); ci.innerHTML='<label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Cliente</label>';
  var cliI=document.createElement('input'); cliI.id='lb2b-client'; cliI.placeholder='Nome cliente B2B'; cliI.value=LaserB2B._client||'';
  cliI.style.cssText='width:100%;padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px';
  cliI.onchange=function(){LaserB2B._client=this.value;}; ci.appendChild(cliI); fg.appendChild(ci);
  var oi=document.createElement('div'); oi.innerHTML='<label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Override €/pz (std: €'+d.bp.toFixed(2)+')</label>';
  var ovI=document.createElement('input'); ovI.id='lb2b-overrule'; ovI.type='number'; ovI.step='0.01'; ovI.placeholder='€ forzato';
  if(ov) ovI.value=LaserB2B._overrule;
  ovI.style.cssText='width:100%;padding:7px;background:var(--bg-card);border:1px solid '+(ov?'#fbbf24':'var(--border)')+';border-radius:7px;color:var(--text);font-size:12px';
  ovI.oninput=function(){var v=parseFloat(this.value);LaserB2B._overrule=(v>0?v:null);drawAdminPanel();};
  oi.appendChild(ovI); fg.appendChild(oi);
  s2.appendChild(fg);
  var nt=document.createElement('textarea'); nt.id='lb2b-note'; nt.placeholder='Note interne (non appaiono nel PDF)...'; nt.value=LaserB2B._overNote||'';
  nt.style.cssText='width:100%;padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;height:50px;resize:vertical';
  nt.oninput=function(){LaserB2B._overNote=this.value;}; s2.appendChild(nt); ap.appendChild(s2);

  // Buttons
  var btns=document.createElement('div'); btns.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  [{l:'📄 PDF Cliente',fn:'LaserB2B.generatePDF&&LaserB2B.generatePDF()',bg:'linear-gradient(135deg,#6366f1,#8b5cf6)',c:'#fff'},
   {l:'💾 Salva',fn:'LaserB2B.saveQuote&&LaserB2B.saveQuote()',bg:'linear-gradient(135deg,#10b981,#059669)',c:'#fff'},
   {l:'📋 Catalogo',fn:'LaserB2B._openCatalogManager&&LaserB2B._openCatalogManager()',bg:'var(--bg-card)',c:'var(--text)',bd:'1px solid var(--border)'},
   {l:'📋 Storico',fn:'LaserB2B.openQuoteHistory&&LaserB2B.openQuoteHistory()',bg:'var(--bg-card)',c:'var(--text-muted)',bd:'1px solid var(--border)'}
  ].forEach(function(b){
    var btn=document.createElement('button'); btn.textContent=b.l;
    btn.style.cssText='padding:9px 14px;background:'+b.bg+';color:'+b.c+';border:'+(b.bd||'none')+';border-radius:9px;cursor:pointer;font-size:12px;font-weight:700';
    btn.onclick=new Function(b.fn); btns.appendChild(btn);
  });
  ap.appendChild(btns);
  var saveOut=document.createElement('div'); saveOut.id='lb2b-save-out'; saveOut.style.marginTop='8px';
  ap.appendChild(saveOut);
  el.appendChild(ap);
}

function calcData(){
  var p=LaserB2B._selProduct; if(!p) return null;
  var mk=document.getElementById('lb2b-machine')?.value||'xtool_f2';
  var m=LaserB2B._MACHINES&&LaserB2B._MACHINES[mk]; if(!m) return null;
  var lH=parseFloat(document.getElementById('lb2b-labor')?.value)||18;
  var pk=parseFloat(document.getElementById('lb2b-pack')?.value)||0.30;
  var ck=document.getElementById('lb2b-channel')?.value||'b2b';
  var mu=(LaserB2B._markup&&LaserB2B._markup[ck])||2.0;
  var qty=LaserB2B._selQty||100;
  var sd=qty>=50?0.20:qty>=25?0.15:qty>=10?0.10:0;
  var stock=LaserB2B._loadStock&&LaserB2B._loadStock()||{};
  var realCost=(stock[p.id]&&stock[p.id].cost)||p.costSup||p.cost||0;
  var mc=realCost*(1-sd);
  var tm=p.timeMin*(qty>=50?0.85:qty>=20?0.92:1);
  var mhc=(m.hourly+(m.energyH||m.energyHourly||0))/60*tm;
  var lc=lH/60*tm;
  var cp=mc+mhc+lc+pk;
  /* La stessa regola della tabella, e per la stessa ragione: la scheda
     riepilogo e la riga della tabella descrivono lo stesso lavoro, e finché
     usavano due regole diverse — qui nessun minimo, là un minimo per pezzo —
     mostravano due prezzi diversi per la stessa quantità sulla stessa
     schermata. */
  var POLd=Object.assign({prezzoMinimo:15, marginePavimento:15}, (LaserB2B._politiche||{}));
  var motored=(typeof window!=='undefined')&&window.InglyCostEngine;
  var bp=motored
    ? motored.prezzo(cp,{strategia:'ricarico', ricarico:mu, marginePavimentoPct:POLd.marginePavimento, ivaPct:0}).netto
    : cp*mu;
  var fp=(LaserB2B._overrule>0)?LaserB2B._overrule:bp;
  var minimoLavoro=false;
  if(!(LaserB2B._overrule>0) && fp*qty < POLd.prezzoMinimo){
    fp=POLd.prezzoMinimo/Math.max(1,qty);
    minimoLavoro=true;
  }
  var mg=Math.round((fp-cp)/fp*100);
  var md=Math.max(0,Math.round((1-cp/(0.65*fp))*100));
  return {p,m,mk,lH,pk,ck,mu,qty,mc,tm,mhc,lc,cp,bp,fp,mg,md,minimoLavoro,prezzoMinimoLavoro:POLd.prezzoMinimo,profit:(fp-cp)*qty,total:fp*qty};
}

// Expose calc + selectProduct
LaserB2B.calc=function(){ 
  var d=calcData(); if(!d) return;
  // Render price table
  var el=document.getElementById('lb2b-calc'); if(!el) return;
  var p=d.p;
  var techCol=getTechColor(p.tech||'laser');
  /* ── Politiche, non formule ────────────────────────────────────────────
     Erano tre numeri sepolti nel codice — il prezzo minimo di 15 €, gli
     scaglioni di sconto sul materiale, il tempo macchina che cala con il
     lotto. I primi due sono decisioni commerciali e ora hanno un nome;
     l'ultimo è conoscenza di mestiere e resta qui, dov'è di casa. */
  var POL = Object.assign({
    prezzoMinimo: 15,
    scontoMateriale: [{qty:200,sconto:.15},{qty:100,sconto:.10},{qty:50,sconto:.07},{qty:20,sconto:.04}],
    marginePavimento: 15,
  }, (LaserB2B._politiche||{}));
  var scontoDi=function(qty){
    for(var i=0;i<POL.scontoMateriale.length;i++) if(qty>=POL.scontoMateriale[i].qty) return POL.scontoMateriale[i].sconto;
    return 0;
  };

  var rows=(LaserB2B._QTYS||[5,10,20,50,100,200]).map(function(qty){
    var sd2=scontoDi(qty);
    var mc2=((LaserB2B._loadStock&&LaserB2B._loadStock()||{})[p.id]?.cost||p.costSup||p.cost||0)*(1-sd2);
    var tm2=p.timeMin*(qty>=50?0.85:qty>=20?0.92:1);
    var mk=document.getElementById('lb2b-machine')?.value||'xtool_f2';
    var m2=LaserB2B._MACHINES&&LaserB2B._MACHINES[mk]; if(!m2) return '';
    var lH2=parseFloat(document.getElementById('lb2b-labor')?.value)||18;
    var pk2=parseFloat(document.getElementById('lb2b-pack')?.value)||0.30;
    var ck2=document.getElementById('lb2b-channel')?.value||'b2b';
    var mu2=(LaserB2B._markup&&LaserB2B._markup[ck2])||2.0;
    var mhc2=(m2.hourly+(m2.energyH||m2.energyHourly||0))/60*tm2;
    var lc2=lH2/60*tm2;

    /* ── Il conto passa dal motore ──────────────────────────────────────
       Questa tabella è quella che l'utente vede davvero: `view-laser_b2b`
       disegna questa interfaccia, e i suoi ventitré comandi chiamano
       `LaserB2B.calc`. La Fase 28 aveva migrato `_calcV32`, che è il
       calcolatore di un'**altra** interfaccia — corretto, e non quello in uso.
       Restano qui i driver del laser: sconto materiale a volume, tempo
       macchina che cala con il lotto. Se ne va la matematica di prezzo. */
    var motore=(typeof window!=='undefined')&&window.InglyCostEngine;
    var cp2, fp2, mg2, pavimento=false, minimoScattato=false;
    if(motore){
      var c2=motore.calcola({
        tecnologia:'generico', qty:1,
        costiPerPezzo:[
          {id:'materiale',  label:'Materiale', value:mc2, detail:(sd2?Math.round(sd2*100)+'% di sconto a volume':'prezzo pieno')},
          {id:'macchina',   label:'Macchina ed energia', value:mhc2, detail:tm2.toFixed(2)+' min'},
          {id:'manodopera', label:'Manodopera', value:lc2, detail:tm2.toFixed(2)+' min', perdibile:false},
          {id:'packaging',  label:'Confezione', value:pk2, perdibile:false},
        ],
      });
      cp2=c2.costoPezzo;
      var pr2=motore.prezzo(cp2,{strategia:'ricarico', ricarico:mu2, marginePavimentoPct:POL.marginePavimento, ivaPct:0});
      /* ── Il minimo è per **lavoro**, non per pezzo ─────────────────────
         Qui c'era `Math.max(POL.prezzoMinimo, pr2.netto)`: un minimo di
         fattura da 15 € applicato al prezzo di ogni singolo pezzo. Su un
         portachiavi da 1,13 € di costo la tabella usciva a 15,00 €/pz a
         **ogni** quantità — 5 pezzi come 200 — e duecento portachiavi
         venivano preventivati 3 000 € invece di 454. Il margine si fermava
         al 92% su tutte le righe, che è il segno che nessuno lo stava più
         calcolando.

         Un minimo di lavoro esiste ed è sensato: sotto una certa cifra la
         commessa non copre il tempo di gestirla. Ma si applica al totale, e
         quando scatta lo si dice. */
      var unitario=(LaserB2B._overrule>0)?LaserB2B._overrule:pr2.netto;
      var totaleRiga=unitario*qty;
      if(!(LaserB2B._overrule>0) && totaleRiga < POL.prezzoMinimo){
        totaleRiga=POL.prezzoMinimo;
        unitario=totaleRiga/Math.max(1,qty);
        minimoScattato=true;
      }
      fp2=unitario;
      mg2=Math.round(pr2.marginePct);
      pavimento=!!pr2.pavimentoScattato || minimoScattato;
      /* Il margine si ricalcola sul prezzo davvero applicato, che il minimo di
         lavoro e il prezzo forzato possono aver spostato. */
      if(fp2!==pr2.netto) mg2=fp2>0?Math.round((fp2-cp2)/fp2*100):0;
    } else {
      /* Nessun prezzo indovinato quando il motore manca: si mostra il costo,
         e il prezzo resta vuoto. Un preventivo sbagliato è peggio di uno
         mancante, ed è la regola che vale in tutto il prodotto. */
      cp2=mc2+mhc2+lc2+pk2; fp2=null; mg2=null;
    }
    if(fp2===null){
      return '<tr style="border-bottom:1px solid var(--border)">'
        +'<td style="padding:8px 10px;font-weight:800;color:var(--text)">'+qty+' pz</td>'
        +'<td colspan="6" style="padding:8px 10px;color:var(--text-dim);font-size:11px">motore di costo non disponibile</td></tr>';
    }
    var mc2col=mg2>=60?'#22c55e':mg2>=40?'#f59e0b':'#ef4444';
    return '<tr style="border-bottom:1px solid var(--border)">'
      +'<td style="padding:8px 10px;font-weight:800;color:var(--text)">'+qty+' pz</td>'
      /* `'…' + sd2 > 0 ? a : b` non fa quello che sembra: la concatenazione
         lega più stretta del confronto, quindi si valutava
         `('<td…>' + sd2) > 0`, cioè `false`, e il ternario restituiva sempre
         il ramo negativo — «—</td>», senza il tag di apertura. L'HTML che ne
         usciva era rotto, e il browser, chiudendo un `<td>` mai aperto, si
         mangiava anche la colonna della quantità: la tabella mostrava prezzi
         senza dire a quale quantità si riferissero. Bastano due parentesi. */
      +'<td style="padding:8px 10px;color:var(--text-muted);font-size:11px">'+(sd2>0?'-'+Math.round(sd2*100)+'%':'—')+'</td>'
      +'<td style="padding:8px 10px;color:var(--text-muted)">€'+cp2.toFixed(2)+'</td>'
      /* Quando il minimo di lavoro alza il prezzo, la riga lo dice: un prezzo
         unitario più alto senza spiegazione è il modo in cui una tabella
         perde la fiducia di chi la legge. */
      +'<td style="padding:8px 10px;font-weight:800;color:var(--primary);font-size:13px">€'+fp2.toFixed(2)
        +(minimoScattato?'<div style="font-size:9px;font-weight:600;color:var(--orange)">minimo lavoro €'+POL.prezzoMinimo+'</div>':'')
      +'</td>'
      +'<td style="padding:8px 10px"><span style="background:'+mc2col+'20;color:'+mc2col+';padding:2px 8px;border-radius:20px;font-weight:700">'+mg2+'%</span></td>'
      +'<td style="padding:8px 10px;font-weight:700">€'+(fp2*qty).toFixed(0)+'</td>'
      +'<td style="padding:8px 10px;color:#22c55e;font-weight:800">€'+((fp2-cp2)*qty).toFixed(0)+'</td>'
      +'</tr>';
  }).join('');

  el.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<span style="font-size:24px">'+p.img+'</span>'
    +'<div><div style="font-size:14px;font-weight:800;color:var(--text)">'+p.name+'</div>'
    +'<div style="display:flex;gap:6px;align-items:center;margin-top:3px">'
    +'<span style="background:'+techCol+'20;color:'+techCol+';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">'+getTechLabel(p.tech)+'</span>'
    +'<span style="font-size:11px;color:var(--text-muted)">'+p.cat+'</span>'
    +'<a href="'+p.url+'" target="_blank" style="font-size:10px;color:var(--primary);text-decoration:none;padding:2px 8px;background:var(--bg-card);border-radius:20px;border:1px solid var(--border)">🛒 '+p.sup+'</a>'
    +'</div></div></div>'
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="background:var(--bg-card)">'
    +'<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:700">Qty</th>'
    +'<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:700">Sconto Mat</th>'
    +'<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:700">Costo/pz</th>'
    +'<th style="padding:8px 10px;text-align:left;color:var(--primary);font-size:10px;font-weight:700">Prezzo/pz</th>'
    +'<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:700">Margine</th>'
    +'<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:700">Totale €</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#22c55e;font-size:10px;font-weight:700">Profitto</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  drawAdminPanel();
};

LaserB2B.selectProduct=function(id){
  this._selProduct=(this._PRODUCTS||DEFAULT_CATALOG).find(function(p){return p.id===id;});
  if(!this._selProduct) return;
  // Highlight
  document.querySelectorAll('[id^="lb2b-btn-"]').forEach(function(b){
    b.classList.remove('sel'); b.style.background='transparent'; b.style.borderLeft='none';
  });
  var btn=document.getElementById('lb2b-btn-'+id);
  if(btn){ btn.classList.add('sel'); btn.style.background='var(--primary-dim)'; btn.style.borderLeft='3px solid var(--primary)'; }
  this.calc&&this.calc();
};

// Catalog manager
// [INGLY-AI v1.0 · Sprint BUG-005] Catalogo inline — sostituisce window.open() con overlay interno
LaserB2B._openCatalogManager=function(){
  // Remove any existing overlay
  var old=document.getElementById('lb2b-cat-overlay');
  if(old) old.remove();

  var _CM={
    prods: (LaserB2B._PRODUCTS||DEFAULT_CATALOG.slice()).map(function(p){return Object.assign({},p);}),
    eidx: -1,
    _gtc: function(t){return{laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'}[t]||'#6366f1';},
    _gtl: function(t){return{laser:'⚡ Laser',sublimazione:'🌈 Sub',dtf:'🎨 DTF','laser+sub':'✨ Multi'}[t]||t;},
    _eid: function(id){return document.getElementById('lb2bcm-'+id);},
    save: function(){try{localStorage.setItem(CATALOG_SK,JSON.stringify(this.prods));}catch(e){}},
    filterTable: function(){
      var q=(this._eid('srch')?.value||'').toLowerCase();
      document.querySelectorAll('#lb2bcm-tbody tr').forEach(function(tr){
        tr.style.display=q&&!tr.textContent.toLowerCase().includes(q)?'none':'';
      });
    },
    renderRows: function(){
      var self=this;
      var h=this.prods.map(function(p,i){
        var tc=self._gtc(p.tech||'laser'); var tl=self._gtl(p.tech||'laser');
        return '<tr style="border-bottom:1px solid var(--border)">'
          +'<td style="padding:7px 10px;font-size:16px;text-align:center">'+p.img+'</td>'
          +'<td style="padding:7px 10px"><div style="font-size:12px;font-weight:700;color:var(--text)">'+p.name+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted);display:flex;gap:4px;margin-top:2px">'
          +'<span style="background:'+tc+'20;color:'+tc+';padding:1px 5px;border-radius:10px">'+tl+'</span>'
          +'<span>'+p.cat+'</span></div></td>'
          +'<td style="padding:7px 10px;color:#f59e0b;font-weight:800">€'+(parseFloat(p.costSup)||0).toFixed(2)+'</td>'
          +'<td style="padding:7px 10px;color:var(--text-muted)">'+(p.timeMin||0)+'min</td>'
          +'<td style="padding:7px 10px;font-size:11px;color:var(--text-muted)">'+p.sup+'</td>'
          +'<td style="padding:7px 10px;text-align:center"><div style="display:flex;gap:4px;justify-content:center">'
          +'<button onclick="_LB2BCM.editProd('+i+')" style="padding:3px 8px;background:#6366f120;color:#818cf8;border:1px solid #6366f140;border-radius:5px;cursor:pointer;font-size:11px">✏️</button>'
          +'<button onclick="_LB2BCM.dupeProd('+i+')" style="padding:3px 8px;background:#10b98115;color:#10b981;border:1px solid #10b98130;border-radius:5px;cursor:pointer;font-size:11px">📋</button>'
          +'<button onclick="_LB2BCM.delProd('+i+')" style="padding:3px 8px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:11px">🗑</button>'
          +'</div></td></tr>';
      }).join('');
      var tb=document.getElementById('lb2bcm-tbody'); if(tb) tb.innerHTML=h;
    },
    openAdd: function(){
      this.eidx=-1;
      var mt=this._eid('mtitle'); if(mt) mt.textContent='Nuovo Prodotto';
      ['i','n','c','id','cost','time','sup','url','notes','tech2'].forEach(function(f){
        var el=document.getElementById('lb2bcm-f'+f); if(el) el.value='';
      });
      var m=this._eid('modal'); if(m) m.style.display='flex';
    },
    editProd: function(i){
      this.eidx=i; var p=this.prods[i];
      var mt=this._eid('mtitle'); if(mt) mt.textContent='Modifica: '+p.name;
      var fields={i:p.img||'🎁',n:p.name,c:p.cat||'',id:p.id,cost:p.costSup,time:p.timeMin,sup:p.sup||'',url:p.url||'',notes:p.notes||''};
      Object.keys(fields).forEach(function(k){
        var el=document.getElementById('lb2bcm-f'+k); if(el) el.value=fields[k];
      });
      var ft=this._eid('ft'); if(ft) ft.value=p.tech||'laser';
      var m=this._eid('modal'); if(m) m.style.display='flex';
    },
    dupeProd: function(i){
      var p=JSON.parse(JSON.stringify(this.prods[i]));
      p.id=p.id+'_copy_'+Date.now().toString().slice(-4); p.name=p.name+' (Copia)';
      this.prods.splice(i+1,0,p); this.save(); this.renderRows();
    },
    saveProd: function(){
      var name=(this._eid('fn')||{}).value||''; if(!name){alert('Inserisci un nome!');return;}
      var tech=(this._eid('ft')||{}).value||(this._eid('ftech2')||{}).value||'laser';
      var prod={
        id:(this._eid('fid')||{}).value||name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,30),
        img:(this._eid('fi')||{}).value||'🎁', tech:tech,
        cat:(this._eid('fc')||{}).value||'Custom', name:name,
        costSup:parseFloat((this._eid('fcost')||{}).value)||0,
        timeMin:parseFloat((this._eid('ftime')||{}).value)||1.5,
        sup:(this._eid('fsup')||{}).value||'', url:(this._eid('furl')||{}).value||'',
        notes:(this._eid('fnotes')||{}).value||''
      };
      if(this.eidx>=0) this.prods[this.eidx]=prod; else this.prods.push(prod);
      this.save(); this.renderRows(); this.closeModal();
    },
    delProd: function(i){
      if(!confirm('Eliminare questo prodotto?')) return;
      this.prods.splice(i,1); this.save(); this.renderRows();
    },
    closeModal: function(){var m=this._eid('modal'); if(m) m.style.display='none';},
    resetDef: function(){
      if(!confirm('Ripristinare i prodotti predefiniti? Tutte le modifiche andranno perse.')) return;
      localStorage.removeItem(CATALOG_SK);
      LaserB2B._PRODUCTS=DEFAULT_CATALOG.slice();
      if(typeof toast!=='undefined') toast('Catalogo ripristinato ai valori predefiniti','info');
      var ov=document.getElementById('lb2b-cat-overlay'); if(ov) ov.remove();
      window._LB2BCM=null;
    },
    savAndClose: function(){
      this.save();
      LaserB2B._PRODUCTS=this.prods;
      if(typeof toast!=='undefined') toast('📦 Catalogo aggiornato!','success');
      var ov=document.getElementById('lb2b-cat-overlay'); if(ov) ov.remove();
      window._LB2BCM=null;
    }
  };
  window._LB2BCM=_CM;

  var cats=[...new Set(_CM.prods.map(function(p){return p.cat;}))];
  var techOpts=['laser','sublimazione','dtf','laser+sub'].map(function(t){
    return '<option value="'+t+'">'+_CM._gtl(t)+'</option>';
  }).join('');
  var catsDL=cats.map(function(c){return '<option value="'+c+'">';}).join('');

  var overlay=document.createElement('div');
  overlay.id='lb2b-cat-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9998;display:flex;flex-direction:column;';
  overlay.innerHTML=
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 20px;background:var(--bg-card);border-bottom:1px solid var(--border);flex-shrink:0">'
    +'<span style="font-size:22px">🎁</span>'
    +'<div style="font-size:17px;font-weight:900;color:var(--text)">Catalogo Prodotti B2B (<span id="lb2bcm-count">'+_CM.prods.length+'</span>)</div>'
    +'<div style="margin-left:auto;display:flex;gap:8px;align-items:center">'
    +'<input id="lb2bcm-srch" oninput="_LB2BCM.filterTable()" placeholder="🔍 Cerca..." style="width:200px;padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
    +'<button onclick="_LB2BCM.openAdd()" style="padding:8px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi</button>'
    +'<button onclick="_LB2BCM.resetDef()" style="padding:8px 14px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">↺ Default</button>'
    +'<button onclick="_LB2BCM.savAndClose()" style="padding:8px 14px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">✅ Salva e Chiudi</button>'
    +'<button onclick="(function(){var ov=document.getElementById(\'lb2b-cat-overlay\');if(ov)ov.remove();window._LB2BCM=null;})()" style="padding:8px 10px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px">✕</button>'
    +'</div></div>'
    +'<div style="flex:1;overflow-y:auto;padding:16px 20px">'
    +'<table style="width:100%;border-collapse:collapse">'
    +'<thead><tr style="position:sticky;top:0;background:var(--bg-card);z-index:1">'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Icona</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Prodotto / Tech / Cat</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Costo Acq.</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Tempo</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Fornitore</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border)">Azioni</th>'
    +'</tr></thead>'
    +'<tbody id="lb2bcm-tbody"></tbody>'
    +'</table></div>'
    // Edit/Add modal
    +'<div id="lb2bcm-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center">'
    +'<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:14px;padding:22px;width:min(520px,95vw);max-height:90vh;overflow-y:auto">'
    +'<div id="lb2bcm-mtitle" style="font-size:15px;font-weight:900;margin-bottom:14px;color:var(--text)">Nuovo Prodotto</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Icona (emoji)</label><input id="lb2bcm-fi" placeholder="🎋" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Tecnica</label><select id="lb2bcm-ft" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px">'+techOpts+'</select></div>'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Categoria</label><input id="lb2bcm-fc" placeholder="Portachiavi" list="lb2bcm-cats-dl" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">ID univoco</label><input id="lb2bcm-fid" placeholder="pk_bambu_rot" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'</div>'
    +'<datalist id="lb2bcm-cats-dl">'+catsDL+'</datalist>'
    +'<label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Nome prodotto</label>'
    +'<input id="lb2bcm-fn" placeholder="Portachiavi Bambù Rotondo 40mm" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 10px">'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Costo €/pz</label><input type="number" id="lb2bcm-fcost" step="0.001" placeholder="0.380" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Tempo (min)</label><input type="number" id="lb2bcm-ftime" step="0.5" placeholder="1.5" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'<div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Tecnica (testo)</label><input id="lb2bcm-ftech2" placeholder="laser" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px"></div>'
    +'</div>'
    +'<label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Fornitore</label>'
    +'<input id="lb2bcm-fsup" placeholder="gadget365.it" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px">'
    +'<label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">URL Fornitore</label>'
    +'<input id="lb2bcm-furl" placeholder="https://..." style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px">'
    +'<label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Note</label>'
    +'<textarea id="lb2bcm-fnotes" rows="2" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;margin-bottom:8px;height:50px;resize:vertical"></textarea>'
    +'<div style="display:flex;gap:8px;margin-top:6px">'
    +'<button onclick="_LB2BCM.saveProd()" style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">💾 Salva</button>'
    +'<button onclick="_LB2BCM.closeModal()" style="padding:8px 16px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">✕ Annulla</button>'
    +'</div></div></div>';

  document.body.appendChild(overlay);
  _CM.renderRows();
};

setTimeout(init, 800);
})();


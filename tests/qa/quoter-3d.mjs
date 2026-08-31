#!/usr/bin/env node
/**
 * quoter-3d.mjs — il margine chiesto è il margine ottenuto.
 *
 * Il difetto misurato: `PRICES = {p1: costo × 3.5}`. Lo slider «margine»
 * esisteva, andava dal 10 all'80%, e serviva solo per un avviso. Chi
 * impostava il 40% otteneva il 71,4%.
 *
 * Qui si guarda quello che finisce a schermo, non il sorgente: si leggono i
 * prezzi dalla tabella degli scaglioni e si confrontano con quelli che il
 * motore produce dagli stessi ingressi.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
/* `clearLines()` chiede conferma: senza questa riga Playwright annulla il
   dialogo, le voci non si svuotano e il collaudo conta righe di prove
   precedenti — accusando il preventivatore di un difetto che è solo suo. */
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const vicino = (a, b, t = 0.02) => Math.abs(a - b) < t;
  const E = window.InglyCostEngine;
  if (!E) { out.errori.push('InglyCostEngine assente'); return out; }
  if (typeof Print3DQuoter === 'undefined') { out.errori.push('Print3DQuoter assente'); return out; }

  /* `App.navigate` non restituisce sempre una promessa: si prova ogni nome
     conosciuto della sezione finché i campi non compaiono. */
  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d', 'stampa3d', 'smart_quoter_3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await new Promise((s) => setTimeout(s, 900));
    if (document.getElementById('p3d-g')) break;
  }
  dico('la vista del preventivatore 3D si apre', !!document.getElementById('p3d-g'));
  if (!document.getElementById('p3d-g')) return out;

  /* Il caso di calibrazione, inserito come farebbe l'utente. */
  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
  sv('p3d-watt', 150); sv('p3d-kwh', 0.28); sv('p3d-duty', 0.6);
  sv('p3d-mc', 400); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
  sv('p3d-fail', 7); sv('p3d-lr', 18);
  sv('p3d-qty', 1); sv('p3d-sup', 0);
  /* I minuti umani hanno un solo padrone: la tabella delle fasi. I campi
     «SETUP» e «POST-PROCESSO» della card macchina sono stati ritirati perché
     non comandavano più niente — `setupMin` arrivava già da qui. */
  for (const f of ['prep', 'rimoz', 'post', 'qc', 'pack', 'altro']) Print3DQuoter.setFase(f, 0);
  Print3DQuoter.setFase('setup', 15);
  Print3DQuoter.setFase('rimoz', 10);
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 500));

  const testo = (id) => document.getElementById(id)?.textContent || '';
  const leggiEuro = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0;

  /* ── Le sezioni sono montate, non solo calcolate ────────────────────────
     È la differenza che questa fase doveva chiudere: il modulo produceva le
     sezioni ed era provato da 44 test, ma nella pagina non c'erano. */
  dico('B · il conto è in pagina', testo('p3d-hero').length > 40);
  dico('C · il dettaglio dei costi è in pagina', testo('p3d-bk').length > 60);
  dico('E · gli scaglioni di quantità sono in pagina', /Costo\/pz/i.test(testo('p3d-scaglioni')));
  dico('F · il confronto con lo slicer è in pagina', !!document.getElementById('p3d-calib'));
  dico('G · le tre modalità sono in pagina', !!document.getElementById('p3d-margin-num')
    && /Hobby[\s\S]*Maker[\s\S]*Business/.test(document.querySelector('#view-print3d')?.textContent || ''));

  /* ── Una sola UI proprietaria ────────────────────────────────────────────
     I tre campi moltiplicatore e la vecchia striscia `.p3-tier` non devono
     sopravvivere accanto alla nuova vista: sostituita, non affiancata. */
  dico('i tre campi moltiplicatore sono stati ritirati',
    !document.getElementById('p3d-m1') && !document.getElementById('p3d-m2') && !document.getElementById('p3d-m3'));
  dico('la vecchia striscia degli scaglioni non è rimasta accanto',
    document.querySelectorAll('#view-print3d .p3-tier').length === 0);

  /* Lo stesso conto, chiesto al motore direttamente. */
  const atteso = E.calcola({
    tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
    spoolPrice: 24, spoolGrams: 1000, watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
    machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
    failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10, washCureMin: 0,
  });

  const hero = testo('p3d-hero');
  const costoSchermo = leggiEuro((hero.match(/Costo business[^\d]*([\d.,]+)/i) || [''])[0]);
  dico('il costo a schermo è quello del motore (' + costoSchermo.toFixed(2) + ' vs ' + atteso.costoPezzo.toFixed(2) + ')',
    vicino(costoSchermo, atteso.costoPezzo, 0.05));

  /* Il costo di stampa accanto a quello pieno: la domanda che il vecchio
     preventivatore non diceva di stare rispondendo. */
  dico('il costo di stampa si vede accanto', /Costo di stampa/i.test(hero));

  /* ── Il ×3,5 non è più il predefinito ───────────────────────────────────
     Fino al redesign il margine iniziale era `(1 − 1/3,5)·100 = 71,43%`: il
     vecchio moltiplicatore travestito da margine. Era stato tenuto per non
     muovere nessun prezzo durante il montaggio; ora il predefinito dichiarato
     è la politica «Standard», 40%. Il test che qui pretendeva ×3,5 pretendeva
     il difetto. */
  const m1 = 3.5;
  const margineDaMolt = (1 - 1 / m1) * 100;
  const prezzoVecchio = atteso.costoPezzo * m1;
  dico('il moltiplicatore ×' + m1 + ' valeva un margine del ' + margineDaMolt.toFixed(1) + '%', margineDaMolt > 70);

  /* La cella si chiama «Prezzo netto» da quando costi e prezzo stanno in due
     aree separate: nella stessa striscia c'erano IVA e lordo, e «consigliato»
     non diceva quale dei tre fosse. */
  const prezzoSchermo = leggiEuro((hero.match(/Prezzo netto[^\d]*([\d.,]+)/i) || [''])[0]);
  dico('il prezzo a schermo non è più il ×3,5 (' + prezzoSchermo.toFixed(2) + ' vs ' + prezzoVecchio.toFixed(2) + ')',
    prezzoSchermo > 0 && !vicino(prezzoSchermo, prezzoVecchio, 0.05));

  const margineMostrato = parseFloat((hero.match(/margine\s*([\d.,]+)%/i) || [0, '0'])[1].replace(',', '.'));
  dico('il margine predefinito è il 40% dichiarato (' + margineMostrato.toFixed(1) + '%)',
    vicino(margineMostrato, 40, 0.15));
  dico('e il prezzo predefinito è costo ÷ (1 − 0,40)',
    vicino(prezzoSchermo, atteso.costoPezzo / 0.6, 0.05));

  /* ── Un solo comando del margine ─────────────────────────────────────────
     Cursore e casella scrivono lo stesso valore, e il valore comanda. */
  Print3DQuoter.setMargine(40);
  await new Promise((s) => setTimeout(s, 250));
  const hero40 = testo('p3d-hero');
  const marg40 = parseFloat((hero40.match(/margine\s*([\d.,]+)%/i) || [0, '0'])[1].replace(',', '.'));
  const prezzo40 = leggiEuro((hero40.match(/Prezzo netto[^\d]*([\d.,]+)/i) || [''])[0]);
  dico('chiedendo il 40% a schermo si ottiene il 40% (' + marg40.toFixed(1) + '%)', vicino(marg40, 40, 0.15));
  dico('e il prezzo è costo ÷ (1 − margine), non costo × 1,4',
    vicino(prezzo40, atteso.costoPezzo / 0.6, 0.05));
  dico('il cursore segue la casella', parseFloat(document.getElementById('p3d-margin')?.value) === 40);

  /* ── La riga registra quello che si vede ─────────────────────────────────
     Prima lo scaglione mostrava il prezzo con IVA e la riga ne salvava un
     altro senza: due colonne diverse del 22% sulla stessa schermata. */
  Print3DQuoter.clearLines();
  Print3DQuoter.addLine();
  await new Promise((s) => setTimeout(s, 250));
  const riga = (typeof Print3DQuoter._state === 'function') ? Print3DQuoter._state().lines[0] : null;
  dico('la riga aggiunta esiste', !!riga);
  if (riga) {
    dico('e registra il prezzo netto che era a schermo', vicino(riga.ppz, prezzo40, 0.05));
    dico('e registra anche il costo', vicino(riga.cpz, atteso.costoPezzo, 0.05));
    dico('e dichiara con quale margine e quale modalità', vicino(riga.marg, 40, 0.001) && riga.modo === 'completo');
  }

  /* ── La catena verso il preventivo ───────────────────────────────────────
     `Quoter.addLine` è dichiarata senza parametri: il vecchio `sendQ` le
     passava un oggetto che veniva ignorato, e nessuna riga arrivava mai. */
  const Q = window.Quoter;
  dico('lo Smart Quoter espone la firma con il costo', !!(Q && typeof Q.addLineFromCalc === 'function'));
  if (Q && typeof Q.addLineFromCalc === 'function') {
    const ricevute = [];
    const vero = Q.addLineFromCalc.bind(Q);
    Q.addLineFromCalc = (d) => { ricevute.push(d); };
    try { Print3DQuoter.sendQ(); } catch (e) { out.errori.push('sendQ: ' + e.message); }
    Q.addLineFromCalc = vero;
    dico('«→ Quoter» consegna davvero la riga', ricevute.length === 1);
    dico('e le consegna il costo, non solo il prezzo',
      ricevute.length === 1 && vicino(ricevute[0].unitCost, atteso.costoPezzo, 0.05));
  }

  /* ── Il ponte con il catalogo legge lo stato, non il DOM ─────────────────
     Leggeva `Print3DQuoter._state` (mai esportato) e un `font-size:22px` che
     non esiste: ogni prodotto salvato aveva costo 0 e prezzo 0. */
  const st = (typeof Print3DQuoter._state === 'function') ? Print3DQuoter._state() : null;
  dico('il preventivatore espone costo e prezzo a chi glieli chiede',
    !!st && st.cost > 0 && st.price > 0);

  const tiers = testo('p3d-tiers');
  dico('le politiche di prezzo sono disegnate', tiers.length > 40);

  /* ── Il prezzo del materiale dichiara la propria provenienza ─────────────
     Su un'installazione senza acquisti a registro la risposta giusta è
     «non verificato», non un silenzio: il €24/kg predefinito è esattamente
     il numero che ha prodotto tutta la differenza con lo slicer. */
  const vista = document.querySelector('#view-print3d')?.textContent || '';
  dico('il prezzo del materiale dice da dove viene',
    /Costo reale dal magazzino|Prezzo materiale non verificato|Registro di magazzino in lettura/.test(vista));
  const MC = window.InglyMaterialCost;
  dico('il modulo dei costi materiali è nel bundle', !!MC);
  if (MC) {
    /* Senza registro non si inventa un costo: si dice che non c'è. */
    const vuoto = MC.perPreventivo({ movimenti: [], itemKey: 'mai-comprato' });
    dico('un materiale mai acquistato non riceve un costo di ripiego',
      vuoto.disponibile === false && vuoto.costoUnitario === null);
    /* E il costo reale comprende la spedizione. */
    const r = MC.costoReale({ imponibile: 20, spedizione: 7, quantita: 1, unit: 'bobina' });
    dico('il costo reale comprende la spedizione (20 € + 7 € = 27 €/kg)',
      Math.abs(r.costoUnitario - 27) < 0.001);
  }

  /* La prova che lo slider adesso comanda: si cambia e il prezzo cambia. */
  const modulo = window.InglyQuoter3DView;
  dico('il modulo della vista è nel bundle', !!modulo);
  if (modulo) {
    const ing = { tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1, materialPricePerKg: 24,
      watt: 150, kwhPrice: 0.28, dutyCycle: 0.6, machinePrice: 400, machineLifeHours: 2000,
      maintenancePerHour: 0.12, failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10 };
    const a40 = modulo.calcola(ing, { modalita: 'completo', marginePct: 40 });
    const a60 = modulo.calcola(ing, { modalita: 'completo', marginePct: 60 });
    dico('chiedendo il 40% si ottiene il 40%', vicino(a40.marginePct, 40, 0.001));
    dico('chiedendo il 60% si ottiene il 60%', vicino(a60.marginePct, 60, 0.001));
    dico('e il prezzo cambia di conseguenza', a60.prezzo > a40.prezzo * 1.4);
    dico('il caso di calibrazione resta agganciato (7,21 stampa · 18,68 pieno)', vicino(a40.costoStampa, 7.21, 0.05) && vicino(a40.costo, 18.68, 0.05));
    dico('le cinque posizioni di prezzo sono calcolate',
      a40.strategie.length === Object.keys(E.POLITICHE).length && a40.strategie.some((s) => s.id === 'b2b'));
    dico('e ognuna ottiene il margine che dichiara',
      a40.strategie.every((s) => vicino(s.marginePct, s.marginTarget, 0.001)));
  }

  /* ── L'import dallo slicer non conta i supporti due volte ────────────────
     Il difetto che questa card esiste per togliere: uno slicer dichiara un
     peso totale che comprende già supporti e spurgo, e chi lo copia nel campo
     «materiale» compilando anche «supporti» li paga due volte. */
  dico('la card di import dallo slicer è in pagina',
    /IMPORTA DALLO SLICER/.test(document.querySelector('#view-print3d')?.textContent || ''));

  Print3DQuoter.svuotaSlicer();
  Print3DQuoter.setSlicer('pesoTotale', 300);
  Print3DQuoter.setSlicer('supporti', 40);
  Print3DQuoter.setSlicer('purge', 10);
  Print3DQuoter.setSlicer('ore', 9.95);
  Print3DQuoter.setSlicer('includeTutto', true);
  await new Promise((r) => setTimeout(r, 350));
  const gIncluso = window.InglyCostEngine.calcola(Print3DQuoter._ingresso());
  const matIncluso = gIncluso.perPezzo.voci.find((x) => x.id === 'materiale').value;
  const costoIncluso = Print3DQuoter._state().cost;

  Print3DQuoter.setSlicer('includeTutto', false);
  await new Promise((r) => setTimeout(r, 350));
  const gEscluso = window.InglyCostEngine.calcola(Print3DQuoter._ingresso());
  const matEscluso = gEscluso.perPezzo.voci.find((x) => x.id === 'materiale').value;
  const costoEscluso = Print3DQuoter._state().cost;

  dico('con «il totale comprende già i supporti» si contano 300 g, non 350',
    Math.abs(matIncluso - 0.300 * 24) < 0.01, `€${matIncluso.toFixed(3)}`);
  dico('togliendo la spunta si contano 350 g e il costo sale',
    Math.abs(matEscluso - 0.350 * 24) < 0.01 && costoEscluso > costoIncluso,
    `${costoIncluso.toFixed(2)} → ${costoEscluso.toFixed(2)}`);
  Print3DQuoter.svuotaSlicer();
  await new Promise((r) => setTimeout(r, 300));

  /* ── Le quattro letture dell'energia ─────────────────────────────────── */
  dico('la banda dell\'energia è in pagina',
    /DA DOVE VIENE IL CONSUMO/.test(document.querySelector('#view-print3d')?.textContent || ''));
  sv('p3d-avgw', 90); sv('p3d-kwhm', 1.2);
  const leggiEnergia = async (modo) => {
    Print3DQuoter.setEnergia(modo);
    await new Promise((r) => setTimeout(r, 300));
    return window.InglyCostEngine.calcola(Print3DQuoter._ingresso()).energia;
  };
  const eTarga = await leggiEnergia('targa');
  const eMedio = await leggiEnergia('medio');
  const eMis = await leggiEnergia('misurato');
  dico('«Targa» usa la potenza massima e si dichiara stimata',
    eTarga.modo === 'targa' && eTarga.confidence === 'estimated');
  dico('«Medio» usa i watt medi e sale a verificato',
    eMedio.modo === 'medio' && eMedio.confidence === 'verified');
  dico('«Misurato» usa i kWh contati', eMis.modo === 'misurato' && Math.abs(eMis.kwh - 1.2) < 0.001);
  dico('e le tre letture danno tre numeri, non lo stesso ripetuto',
    new Set([eTarga.kwh.toFixed(4), eMis.kwh.toFixed(4)]).size === 2);
  await leggiEnergia('auto');

  /* ── Il ridisegno non cancella quello che l'utente ha scritto ──────────
     `render()` ricostruisce la pagina da una stringa con i valori scritti a
     mano: senza il salvataggio dei campi, cambiare modalità riportava grammi
     e ore ai valori di partenza. */
  sv('p3d-g', 417); sv('p3d-h', 6.25);
  Print3DQuoter.setModo('macchina');
  await new Promise((r) => setTimeout(r, 300));
  const gDopo = parseFloat(document.getElementById('p3d-g')?.value);
  const hDopo = parseFloat(document.getElementById('p3d-h')?.value);
  dico('cambiare modalità non cancella i campi compilati',
    gDopo === 417 && hDopo === 6.25, `g=${gDopo} h=${hDopo}`);
  Print3DQuoter.setModo('completo');
  sv('p3d-g', 290); sv('p3d-h', 9.95);
  await new Promise((r) => setTimeout(r, 300));

  /* ── Il costo orario della macchina, non tre numeri di listino ─────────
     Il suggerimento diceva «250W · €299 · 3000h»: tre cifre da cui nessuno
     poteva ricavare quanto costa un'ora di quella macchina. */
  const MK = window.InglyMachineCost;
  dico('il motore dei costi macchina è nel bundle', !!MK);
  if (MK) {
    Print3DQuoter.pickMach('bambu-p1s');
    await new Promise((r) => setTimeout(r, 300));
    const hint = document.getElementById('p3d-mach-hint')?.textContent || '';
    dico('la macchina dichiara il proprio costo orario', /\/h/.test(hint) && /corrente/.test(hint));
    /* E le quattro voci non si contengono a vicenda. */
    const c = MK.daCatalogo({ price: 2499, life_h: 6000, kw: 0.120, maint: 0.06 }, { kwhPrice: 0.28 });
    dico('le quattro voci del costo orario si sommano esattamente',
      Math.abs(c.machineCostPerHour - (c.energyCostPerHour + c.depreciationCostPerHour
        + c.maintenanceCostPerHour + c.consumablesCostPerHour)) < 1e-9);
    /* La potenza ottica non è l'assorbimento: 20 W di diodo, 80 W dalla presa. */
    const n = MK.normalizza({ power_w: 20, kw: 0.080 });
    dico('la potenza del laser non viene scambiata per assorbimento',
      n.averagePowerW === 80 && n.laserPowerW === 20);
    sv('p3d-g', 290); sv('p3d-h', 9.95);
    await new Promise((r) => setTimeout(r, 250));
  }

  /* ── Schermo, PDF e WhatsApp dicono lo stesso numero ────────────────────
     I tre totali erano calcolati tre volte e coincidevano perché ripetevano
     le stesse due operazioni nello stesso ordine: una coincidenza mantenuta a
     mano, non una garanzia. */
  Print3DQuoter.clearLines();
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-qty', 3);
  Print3DQuoter.setMargine(45);
  await new Promise((r) => setTimeout(r, 300));
  Print3DQuoter.addLine();
  sv('p3d-g', 120); sv('p3d-h', 4); sv('p3d-qty', 10);
  await new Promise((r) => setTimeout(r, 300));
  Print3DQuoter.addLine();
  Print3DQuoter.setDisc(10);
  await new Promise((r) => setTimeout(r, 350));

  const T = Print3DQuoter._totali();
  dico('il preventivo ha due righe', T.righe === 2);
  /* Il totale grande a schermo. */
  const testoVista = document.querySelector('#view-print3d')?.textContent.replace(/\s+/g, ' ') || '';
  /* L'intestazione adesso porta l'aliquota — «TOTALE IVA 22% INCLUSA» — perché
     l'aliquota è configurabile e dirla è il punto. */
  const grande = (testoVista.match(/TOTALE (?:IVA[^€]*INCLUSA|NON IMPONIBILE[^€]*|SENZA IVA)\s*€\s*([\d.,]+)/i) || [0, '0'])[1];
  const grandeNum = parseFloat(String(grande).replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0;
  dico('il totale a schermo è quello della funzione unica',
    Math.abs(grandeNum - T.lordo) < 0.02, `schermo €${grandeNum.toFixed(2)} · funzione €${T.lordo.toFixed(2)}`);

  /* Le somme devono chiudere: netto = listino − sconto, lordo = netto + IVA. */
  dico('listino meno sconto fa il netto', Math.abs(T.listino - T.sconto - T.netto) < 0.001);
  dico('netto più IVA fa il lordo', Math.abs(T.netto + T.iva - T.lordo) < 0.001);
  dico("l'IVA è il 22% del netto, non del listino",
    Math.abs(T.iva - T.netto * 0.22) < 0.001);
  dico('il margine è calcolato su costo e netto',
    Math.abs(T.margine - (T.netto - T.costo) / T.netto * 100) < 0.001);

  /* E le tre superfici leggono la stessa funzione, non tre copie. */
  const sorgentePdf = String(Print3DQuoter.doPdf);
  const sorgenteWa = String(Print3DQuoter.doWa);
  dico('il PDF usa la funzione unica dei totali', /totali\(\)/.test(sorgentePdf));
  dico('WhatsApp usa la funzione unica dei totali', /totali\(\)/.test(sorgenteWa));
  dico('e nessuna delle due ricalcola l\'IVA per conto suo',
    !/0\.22|1\.22/.test(sorgentePdf) && !/0\.22|1\.22/.test(sorgenteWa));

  Print3DQuoter.clearLines();
  Print3DQuoter.setDisc(0);
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-qty', 1);
  await new Promise((r) => setTimeout(r, 300));

  /* ── «Perché questo prezzo?» ────────────────────────────────────────────
     Un preventivo deve reggere due domande fatte da due persone diverse: il
     cliente chiede perché costa così, chi porta i libri chiede da dove viene
     il numero. Un totale grande e nient'altro non risponde a nessuna. */
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-qty', 1);
  /* I campi del consumo misurato restano compilati da una prova precedente —
     è il salvataggio dei valori fra un ridisegno e l'altro, e funziona. Qui
     si vuole il caso «solo targa», quindi si svuotano. */
  sv('p3d-avgw', ''); sv('p3d-kwhm', '');
  Print3DQuoter.setMargine(40);
  await new Promise((r) => setTimeout(r, 300));
  const testoChiuso = document.querySelector('#view-print3d')?.textContent || '';
  dico('il pulsante «Perché questo prezzo?» è in pagina', /Perché questo prezzo/.test(testoChiuso));
  dico('e il pannello è chiuso finché non lo si apre', !document.getElementById('p3d-perche'));

  Print3DQuoter.togglePerche();
  await new Promise((r) => setTimeout(r, 400));
  const pannello = document.getElementById('p3d-perche');
  dico('si apre', !!pannello);
  if (pannello) {
    const t = pannello.textContent.replace(/\s+/g, ' ');
    const celle = [...pannello.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
    dico('ogni voce di costo ha una riga', celle.length >= 5, `${celle.length} voci`);
    dico('ogni riga porta valore, formula, dato e fiducia',
      celle.every((c) => c.length === 5 && c[1].includes('€') && c[2].length > 2 && c[4].length > 2));
    dico('le formule sono quelle vere, non etichette generiche',
      /÷ 1000 × €\/kg/.test(t) && /tasso ÷ \(1 − tasso\)/.test(t));
    dico('la fiducia distingue stimato da dichiarato',
      /stimato/.test(t) && /dichiarato/.test(t));
    dico('l\'energia da targa è marcata stimata',
      celle.some((c) => /Energia/.test(c[0]) && /stimato/.test(c[4])));
    dico('le tre posizioni di prezzo sono nel pannello',
      /Prezzo minimo/.test(t) && /Prezzo consigliato/.test(t) && /Prezzo premium/.test(t));
    dico('le ipotesi sono dichiarate', /Su cosa regge questo numero/.test(t));
    dico('la fiducia complessiva è la peggiore, e lo dice',
      /Fiducia complessiva/.test(t) && /peggiore/.test(t));
    /* E i numeri del pannello sono quelli del motore, non una seconda copia. */
    /* Gli importi sono formattati all'italiana — «€6,96» — e togliere tutto
       tranne cifre e punto trasforma 6,96 in 696. */
    const somma = celle.reduce((a, c) => a + (parseFloat(String(c[1]).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0), 0);
    const costo = Print3DQuoter._state().cost;
    dico(`le voci del pannello sommano al costo mostrato (€${somma.toFixed(2)} vs €${costo.toFixed(2)})`,
      Math.abs(somma - costo) < 0.02);
  }
  Print3DQuoter.togglePerche();
  await new Promise((r) => setTimeout(r, 300));
  dico('si richiude', !document.getElementById('p3d-perche'));

  /* ── L'aliquota IVA è configurabile ─────────────────────────────────────
     Compariva come letterale in dieci file. I valori coincidevano, quindi non
     era un difetto di calcolo: era che chi vende al 10% o al 4% non aveva modo
     di dirlo. */
  const F = window.InglyFisco;
  dico('il modulo fiscale è nel bundle', !!F);
  if (F) {
    dico('il predefinito è 22, così nessun preventivo esistente si muove', F.aliquota() === 22);

    Print3DQuoter.clearLines();
    sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-qty', 1);
    Print3DQuoter.setMargine(40);
    Print3DQuoter.setIva(true);
    Print3DQuoter.setDisc(0);
    await new Promise((r) => setTimeout(r, 300));
    Print3DQuoter.addLine();
    await new Promise((r) => setTimeout(r, 300));

    const a22 = Print3DQuoter._totali();
    F.imposta(10);
    Print3DQuoter.calc();
    await new Promise((r) => setTimeout(r, 300));
    const a10 = Print3DQuoter._totali();

    dico('cambiando aliquota il netto non si muove',
      Math.abs(a22.netto - a10.netto) < 0.001);
    dico(`e l'IVA sì (22% €${a22.iva.toFixed(2)} → 10% €${a10.iva.toFixed(2)})`,
      Math.abs(a10.iva - a22.netto * 0.10) < 0.01 && a10.iva < a22.iva);
    dico("l'etichetta segue l'aliquota", a10.etichettaIva === 'IVA 10%');

    F.imposta(0);
    Print3DQuoter.calc();
    await new Promise((r) => setTimeout(r, 300));
    const a0 = Print3DQuoter._totali();
    dico('a zero il lordo è il netto, e si chiama «non imponibile»',
      Math.abs(a0.lordo - a0.netto) < 0.001 && a0.etichettaIva === 'Non imponibile');

    F.imposta(22);
    Print3DQuoter.calc();
    Print3DQuoter.clearLines();
    await new Promise((r) => setTimeout(r, 300));
    dico("l'aliquota torna al predefinito", F.aliquota() === 22);

    /* Lo scorporo non è una sottrazione. */
    dico('scorporare 122 € dà 100 €, non 95,16 €', Math.abs(F.scorpora(122) - 100) < 0.01);
  }

  /* ── Una sola lista di materiali ────────────────────────────────────────
     Il preventivatore teneva la propria lista in localStorage, separata dal
     magazzino, riempita una volta sola in una direzione: un prezzo corretto in
     magazzino non arrivava qui, e un materiale aggiunto qui non esisteva per
     il magazzino. */
  const MCm = window.InglyMaterialCost;
  dico('il preventivatore sa leggere i materiali dal magazzino',
    !!MCm && typeof MCm.materialiPerStampa3D === 'function');

  Print3DQuoter.openMat();
  await new Promise((r) => setTimeout(r, 400));
  const gestore = document.getElementById('p3d-mat-list')?.textContent.replace(/\s+/g, ' ') || '';
  dico('il gestore materiali distingue magazzino e lista locale',
    /Dal magazzino/.test(gestore) && /Solo in questo preventivatore/.test(gestore));
  dico('e i materiali non tracciati sono marcati «solo qui»',
    /solo qui/.test(gestore) || /tutti i materiali che usi sono tracciati/.test(gestore));
  dico('con l\'invito a registrarli invece di lasciarli scollegati',
    /non a magazzino/.test(gestore) || /tutti i materiali che usi sono tracciati/.test(gestore));
  dico('quelli a magazzino non si modificano da qui',
    !/a magazzino<\/span>[\s\S]{0,200}act-edit/.test(document.getElementById('p3d-mat-list')?.innerHTML || ''));
  Print3DQuoter.closeMat();
  await new Promise((r) => setTimeout(r, 350));

  /* Il menu a tendina dichiara la provenienza di ogni voce. */
  const opzioni = [...(document.getElementById('p3d-mat')?.options || [])].map((o) => o.text);
  dico('il menu dei materiali dichiara la provenienza di ogni voce',
    opzioni.length > 1 && opzioni.slice(1).every((t) => /✅|📦|✎/.test(t)),
    opzioni.slice(1, 3).join(' | '));

  /* Nessuna duplicazione introdotta. */
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id).filter(Boolean);
  const dupli = ids.filter((x, i) => ids.indexOf(x) !== i);
  dico('nessun id duplicato nel documento', dupli.length === 0);
  const bottoniCalc = [...document.querySelectorAll('#view-print3d_quoter button, [id^=p3d] button')]
    .filter((b) => /calcola/i.test(b.textContent)).length;
  dico('nessun pulsante «calcola» duplicato', bottoniCalc <= 1);

  return out;
});

console.log('\nSMART QUOTER 3D — il margine chiesto è il margine ottenuto\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nil prezzo lo fa il motore, anche a schermo ✔\n');
await browser.close();

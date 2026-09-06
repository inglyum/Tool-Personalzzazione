#!/usr/bin/env node
/**
 * quoter3d-calcoli.mjs — FASI 3-13 e 15-19 del collaudo funzionale.
 *
 * Non si legge il codice: si preme, e si guarda il numero che esce.
 *
 * Ogni gruppo parte dallo stesso ingresso — 100 g, 2 h — e chiede una cosa
 * sola: il numero cambia quando deve, resta quando deve, ed è coerente con
 * quello che l'interfaccia dichiara.
 *
 *   node tests/qa/quoter3d-calcoli.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', async (d) => { try { await d.accept(d.type() === 'prompt' ? '1' : undefined); } catch (e) {} });

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
  window.__rifiuti = [];
  window.addEventListener('unhandledrejection', (e) => window.__rifiuti.push(String(e.reason)));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* Le funzioni di servizio vivono nella pagina: si installano una volta. */
await page.evaluate(async () => {
  window.__q = {
    a: (ms) => new Promise((s) => setTimeout(s, ms)),
    set: (id, val) => {
      const e = document.getElementById(id);
      if (!e) return false;
      e.value = val;
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    get: (id) => { const e = document.getElementById(id); return e ? e.value : null; },
    /* Il conto vero, non quello riletto dallo schermo: è la funzione che
       schermo, PDF e WhatsApp usano tutti e tre. */
    tot: () => Print3DQuoter._totali(),
    /* Il calcolo vivo: quello che il pannello dei prezzi mostra prima che una
       voce entri nel preventivo. `tot()` somma le voci già aggiunte — due
       domande diverse, e confonderle misura la lista invece del calcolo. */
    vivo: () => Print3DQuoter._calcolo() || {},
    ing: () => Print3DQuoter._ingresso(),
    base: async () => {
      window.__q.set('p3d-g', '100');
      window.__q.set('p3d-h', '2');
      Print3DQuoter.calc();
      await window.__q.a(500);
    },
  };
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 3500));
});

/* ── FASE 3 · IVA ───────────────────────────────────────────────────────── */
const iva = await page.evaluate(async () => {
  const { a, set, tot } = window.__q;
  await window.__q.base();
  Print3DQuoter.addLine();
  await a(600);

  Print3DQuoter.setIva(true); await a(350);
  const con = tot();
  Print3DQuoter.setIva(false); await a(350);
  const senza = tot();
  Print3DQuoter.setIva(true); await a(350);
  const riacceso = tot();

  /* Dieci alternanze: nessuna perdita di input, nessun errore, nessun
     raddoppio del DOM. */
  const nodiPrima = document.getElementById('view-print3d').querySelectorAll('*').length;
  const erroriPrima = window.__rifiuti.length;
  const valori = [];
  for (let i = 0; i < 10; i += 1) {
    Print3DQuoter.setIva(i % 2 === 0);
    await a(120);
    valori.push({ iva: tot().iva, netto: tot().netto });
  }
  const nodiDopo = document.getElementById('view-print3d').querySelectorAll('*').length;

  /* Il pulsante acceso si dichiara con lo sfondo, non con una classe. */
  const attivo = () => {
    const si = document.getElementById('p3d-iva-yes');
    const no = document.getElementById('p3d-iva-no');
    const sf = (e) => e ? (e.getAttribute('style') || '').match(/background:[^;]*/) ? (e.getAttribute('style').match(/background:[^;]*/) || [])[0] : '' : null;
    return { si: sf(si), no: sf(no) };
  };
  Print3DQuoter.setIva(true); await a(300);
  const classiCon = attivo();
  Print3DQuoter.setIva(false); await a(300);
  const classiSenza = attivo();
  Print3DQuoter.setIva(true); await a(300);

  return {
    con, senza, riacceso, valori, nodiPrima, nodiDopo,
    peso: window.__q.get('p3d-g'),
    rifiuti: window.__rifiuti.length - erroriPrima,
    classiCon, classiSenza,
  };
});
dico('FASE 3 · con IVA l imposta è positiva (' + (iva.con.iva || 0).toFixed(2) + ')', iva.con.iva > 0);
dico('FASE 3b · senza IVA l imposta è zero (' + (iva.senza.iva || 0).toFixed(2) + ')', iva.senza.iva === 0);
dico('FASE 3c · il netto non cambia fra le due modalità ('
  + iva.con.netto.toFixed(2) + ' / ' + iva.senza.netto.toFixed(2) + ')',
  Math.abs(iva.con.netto - iva.senza.netto) < 0.005);
dico('FASE 3d · lordo = netto + IVA (' + iva.con.lordo.toFixed(2) + ')',
  Math.abs(iva.con.lordo - (iva.con.netto + iva.con.iva)) < 0.02);
dico('FASE 3e · senza IVA lordo = netto', Math.abs(iva.senza.lordo - iva.senza.netto) < 0.005);
dico('FASE 3f · riaccendendo l IVA si torna esattamente al valore di prima',
  Math.abs(iva.riacceso.lordo - iva.con.lordo) < 0.005);
dico('FASE 3g · dieci alternanze danno sempre lo stesso netto',
  new Set(iva.valori.map((v) => v.netto.toFixed(4))).size === 1);
dico('FASE 3h · e l IVA alterna fra zero e positiva, senza mai bloccarsi',
  iva.valori.filter((v) => v.iva > 0).length === 5 && iva.valori.filter((v) => v.iva === 0).length === 5);
/* Il pannello con l'IVA ha qualche riga in più di quello senza: un numero di
   nodi diverso è corretto. Quel che non deve succedere è che **crescano** a
   ogni giro — è così che si riconosce un ridisegno che accumula. */
dico('FASE 3i · dieci alternanze non fanno crescere il DOM ('
  + iva.nodiPrima + ' → ' + iva.nodiDopo + ')', iva.nodiDopo <= iva.nodiPrima + 40);
dico('FASE 3j · e non perdono l input (' + iva.peso + ')', iva.peso === '100');
dico('FASE 3k · nessuna promessa rifiutata durante le alternanze', iva.rifiuti === 0);
dico('FASE 3l · il pulsante acceso è quello giusto',
  iva.classiCon.si !== iva.classiSenza.si && iva.classiCon.no !== iva.classiSenza.no);

/* ── FASE 4 · strategie di prezzo ───────────────────────────────────────── */
const strategie = await page.evaluate(async () => {
  const { a, tot } = window.__q;
  await window.__q.base();
  /* Gli id, senza doppioni: le politiche compaiono in due punti della pagina
     — il selettore compatto con le percentuali e le schede di confronto con i
     prezzi — e sono lo stesso comando, non due. */
  const elenco = [...new Set([...document.querySelectorAll('#view-print3d [onclick*="setStrategia"]')]
    .map((b) => (b.getAttribute('onclick').match(/setStrategia\('([^']+)'\)/) || [])[1])
    .filter(Boolean))];
  const misure = [];
  for (const id of elenco) {
    Print3DQuoter.setStrategia(id);
    await a(400);
    const r = window.__q.vivo();
    /* Acceso = bordo ciano, che è come la pagina lo dichiara. */
    const acceso = [...document.querySelectorAll('#view-print3d [onclick*="setStrategia(\'' + id + '\')"]')]
      .filter((b) => /#22d3ee/.test(b.getAttribute('style') || '')).length;
    misure.push({
      id,
      margine: parseFloat(window.__q.get('p3d-margin-num')),
      netto: r.prezzo, costo: r.costo, acceso,
    });
  }
  return { elenco, misure };
});
dico('FASE 4 · le strategie si leggono dalla pagina (' + strategie.elenco.join(', ') + ')',
  strategie.elenco.length >= 4);
dico('FASE 4a · scegliendone una, la pagina la accende',
  strategie.misure.every((m) => m.acceso >= 1));
const margini = strategie.misure.map((m) => m.margine);
dico('FASE 4b · ogni strategia porta un margine diverso (' + margini.join(' · ') + ')',
  new Set(margini.filter((m) => isFinite(m))).size >= 3);
const prezzi = strategie.misure.map((m) => Math.round(m.netto * 100));
dico('FASE 4c · e un prezzo diverso (' + strategie.misure.map((m) => m.netto.toFixed(2)).join(' · ') + ')',
  new Set(prezzi).size >= 3);
const coerenti = strategie.misure.filter((m) => m.costo > 0 && isFinite(m.margine))
  .map((m) => {
    const atteso = m.costo / (1 - m.margine / 100);
    return { id: m.id, atteso, reale: m.netto, scarto: Math.abs(atteso - m.netto) / atteso * 100 };
  });
dico('FASE 4d · prezzo = costo / (1 − margine) per ogni strategia ('
  + coerenti.map((c) => c.id + ' ' + c.scarto.toFixed(2) + '%').join(' · ') + ')',
  coerenti.length > 0 && coerenti.every((c) => c.scarto < 0.6));

/* ── FASE 6 · margine: cursore e campo ──────────────────────────────────── */
const margine = await page.evaluate(async () => {
  const { a, set, get, tot } = window.__q;
  await window.__q.base();
  const prove = [];
  for (const m of [10, 20, 30, 40, 50, 60, 70]) {
    /* Il cursore, come lo muove un utente. */
    const cursore = document.getElementById('p3d-margin');
    cursore.value = String(m);
    cursore.dispatchEvent(new Event('input', { bubbles: true }));
    await a(320);
    const r = window.__q.vivo();
    prove.push({
      via: 'cursore', chiesto: m,
      campo: parseFloat(get('p3d-margin-num')),
      cursore: parseFloat(cursore.value),
      costo: r.costo, netto: r.prezzo,
    });
  }
  for (const m of [15, 35, 55]) {
    /* E il campo numerico. */
    set('p3d-margin-num', String(m));
    Print3DQuoter.setMargine(m);
    await a(320);
    const r = window.__q.vivo();
    prove.push({
      via: 'campo', chiesto: m,
      campo: parseFloat(get('p3d-margin-num')),
      cursore: parseFloat(get('p3d-margin')),
      costo: r.costo, netto: r.prezzo,
    });
  }
  return prove;
});
const sincronizzati = margine.every((p) => Math.abs(p.campo - p.chiesto) < 0.15
  && Math.abs(p.cursore - p.chiesto) <= 1);
dico('FASE 6 · cursore e campo restano sincronizzati su dieci valori', sincronizzati);
const formula = margine.filter((p) => p.costo > 0).map((p) => {
  const atteso = p.costo / (1 - p.chiesto / 100);
  return { m: p.chiesto, scarto: Math.abs(atteso - p.netto) / atteso * 100 };
});
dico('FASE 6b · P = C / (1 − M) su tutti i valori (scarto max '
  + Math.max(...formula.map((f) => f.scarto)).toFixed(3) + '%)',
  formula.length >= 8 && formula.every((f) => f.scarto <= 0.1));
const inverso = margine.filter((p) => p.netto > 0).map((p) => {
  const reale = (p.netto - p.costo) / p.netto * 100;
  return Math.abs(reale - p.chiesto);
});
dico('FASE 6c · e il margine che ne risulta è quello chiesto (scarto max '
  + Math.max(...inverso).toFixed(3) + ' punti)', inverso.every((d) => d <= 0.1));

/* ── FASE 7 · sconti, in matrice con l IVA ──────────────────────────────── */
/* La riga del preventivo è uno snapshot: porta il prezzo com'era quando è
   stata aggiunta, e non si riscrive dopo. Sconto e IVA vanno quindi impostati
   **prima** di aggiungere la voce — misurarli dopo misurerebbe una promessa
   che il modulo non fa. */
const sconti = await page.evaluate(async () => {
  const { a, tot } = window.__q;
  await window.__q.base();
  Print3DQuoter.setMargine(40);
  await a(300);
  const righe = [];
  for (const ivaOn of [false, true]) {
    for (const d of [0, 5, 10, 20]) {
      Print3DQuoter.clearLines(); await a(250);
      Print3DQuoter.setIva(ivaOn); await a(200);
      Print3DQuoter.setDisc(d); await a(300);
      Print3DQuoter.addLine(); await a(450);
      const t = tot();
      righe.push({
        iva: ivaOn, sconto: d,
        listino: t.listino, netto: t.netto, imposta: t.iva, lordo: t.lordo,
      });
    }
  }
  Print3DQuoter.setDisc(0);
  Print3DQuoter.setIva(true);
  await a(250);
  return righe;
});
const guastiSconto = sconti.filter((r) => {
  const attesoNetto = r.listino * (1 - r.sconto / 100);
  const okNetto = r.listino > 0 && Math.abs(attesoNetto - r.netto) / r.listino < 0.002;
  const okLordo = Math.abs(r.lordo - (r.netto + r.imposta)) < 0.02;
  const okIva = r.iva ? r.imposta > 0 : r.imposta === 0;
  return !(okNetto && okLordo && okIva);
}).map((r) => (r.iva ? 'IVA' : 'no') + '/' + r.sconto + '%');
dico('FASE 7 · otto combinazioni IVA × sconto, tutte coerenti'
  + (guastiSconto.length ? ' — sbagliate: ' + guastiSconto.join(' ') : ''),
  guastiSconto.length === 0);
dico('FASE 7b · e nessuna produce un numero non finito',
  sconti.every((r) => [r.listino, r.netto, r.imposta, r.lordo].every((v) => isFinite(v) && v >= 0)));
dico('FASE 7c · lo sconto si vede davvero sul netto ('
  + sconti.filter((r) => !r.iva).map((r) => r.sconto + '% → ' + r.netto.toFixed(2)).join(' · ') + ')',
  new Set(sconti.filter((r) => !r.iva).map((r) => r.netto.toFixed(2))).size === 4);

/* ── FASE 5 · modalità rapida / professionale ───────────────────────────── */
const modalita = await page.evaluate(async () => {
  const { a, get, set } = window.__q;
  await window.__q.base();
  /* Le voci avanzate stanno in schede intere — lavoro, componenti,
     confezione, spese generali — e molti dei loro campi non hanno un id:
     contare solo quelli con id direbbe che le due modalità sono uguali. */
  const campiVisibili = () => [...document.querySelectorAll(
    '#view-print3d input, #view-print3d select, #view-print3d textarea')]
    .filter((e) => e.offsetParent !== null).length;
  const schede = () => [...document.querySelectorAll('#view-print3d .p3-ct')]
    .filter((e) => e.offsetParent !== null).map((e) => e.textContent.trim().slice(0, 24));

  set('p3d-lr', '31');           // un campo avanzato, con un valore riconoscibile
  Print3DQuoter.calc();
  await a(500);
  const costoPrima = window.__q.vivo().costo;

  Print3DQuoter.setModalita('professionale'); await a(600);
  const inPro = { campi: campiVisibili(), schede: schede(), valore: get('p3d-lr'), costo: window.__q.vivo().costo };
  Print3DQuoter.setModalita('rapida'); await a(600);
  const inRapida = { campi: campiVisibili(), schede: schede(), costo: window.__q.vivo().costo };
  Print3DQuoter.setModalita('professionale'); await a(500);
  Print3DQuoter.setModalita('rapida'); await a(500);
  Print3DQuoter.setModalita('professionale'); await a(600);
  const dopoGiro = { valore: get('p3d-lr'), costo: window.__q.vivo().costo };
  return { costoPrima, inRapida, inPro, dopoGiro };
});
dico('FASE 5 · in rapida si vedono meno campi che in professionale ('
  + modalita.inRapida.campi + ' contro ' + modalita.inPro.campi + ')',
  modalita.inRapida.campi < modalita.inPro.campi);
dico('FASE 5b · e meno schede (' + modalita.inRapida.schede.length + ' contro '
  + modalita.inPro.schede.length + ': mancano '
  + modalita.inPro.schede.filter((x) => !modalita.inRapida.schede.includes(x)).join(', ') + ')',
  modalita.inRapida.schede.length < modalita.inPro.schede.length);
dico('FASE 5c · tornando in professionale il valore avanzato è ancora lì ('
  + modalita.inPro.valore + ')', modalita.inPro.valore === '31');
dico('FASE 5d · due giri avanti e indietro non lo perdono (' + modalita.dopoGiro.valore + ')',
  modalita.dopoGiro.valore === '31');
dico('FASE 5e · e il costo resta lo stesso ('
  + modalita.costoPrima.toFixed(3) + ' → ' + modalita.dopoGiro.costo.toFixed(3) + ')',
  Math.abs(modalita.costoPrima - modalita.dopoGiro.costo) < 0.005);

/* ── FASE 8 · energia ───────────────────────────────────────────────────── */
const energia = await page.evaluate(async () => {
  const { a, set, ing } = window.__q;
  await window.__q.base();
  set('p3d-watt', '200');
  set('p3d-kwh', '0.30');
  set('p3d-avgw', '150');
  set('p3d-kwhm', '0.9');
  Print3DQuoter.calc();
  await a(400);
  const modi = ['auto', 'misurato', 'medio', 'targa'];
  const out = [];
  for (const m of modi) {
    Print3DQuoter.setEnergia(m);
    await a(450);
    const i = ing();
    out.push({
      modo: m,
      /* Quale sorgente il motore riceve davvero: il modo si legge da quale
         delle tre chiavi arriva valorizzata, non da un'etichetta. */
      sorgente: i.measuredEnergyKwh != null ? 'misurato'
        : (i.averagePowerW != null ? 'medio' : (i.ratedPowerW != null || i.watt != null ? 'targa' : 'nessuna')),
      watt: i.watt, ratedPowerW: i.ratedPowerW, avgW: i.averagePowerW, kwh: i.measuredEnergyKwh,
      costoEnergia: (window.__q.vivo().voci || []).filter((v) => v.id === 'energia').map((v) => v.value)[0],
    });
  }
  return out;
});
dico('FASE 8 · ogni modalità energia manda al motore la sua sorgente ('
  + energia.map((e) => e.modo + '→' + e.sorgente).join(' ') + ')',
  energia.filter((e) => e.modo === 'misurato')[0].sorgente === 'misurato'
  && energia.filter((e) => e.modo === 'medio')[0].sorgente === 'medio'
  && energia.filter((e) => e.modo === 'targa')[0].sorgente === 'targa');
dico('FASE 8b · «misurato» porta i kWh misurati (' + energia.filter((e) => e.modo === 'misurato')[0].kwh + ')',
  energia.filter((e) => e.modo === 'misurato')[0].kwh === 0.9);
dico('FASE 8c · «medio» porta i watt medi (' + energia.filter((e) => e.modo === 'medio')[0].avgW + ')',
  energia.filter((e) => e.modo === 'medio')[0].avgW === 150);
dico('FASE 8d · e il costo dell energia cambia di conseguenza ('
  + energia.map((e) => (e.costoEnergia || 0).toFixed(3)).join(' · ') + ')',
  new Set(energia.map((e) => (e.costoEnergia || 0).toFixed(4))).size >= 2);

/* ── FASE 9 · FDM e resina ──────────────────────────────────────────────── */
/* Osservabili giusti: la pagina, cambiando tecnologia, riscrive le etichette
   (g/ml, €/kg / €/L) e i valori predefiniti dei parametri macchina, che per la
   resina sono diversi (40W invece di 150, 250€ invece di 420, 12% di fallimenti
   invece di 7). Se i predefiniti non arrivano, la resina viene costata con i
   numeri della FDM. */
const tecnologia = await page.evaluate(async () => {
  const { a, get } = window.__q;
  const testo = (id) => ((document.getElementById(id) || {}).textContent || '').trim();
  const stato = () => ({
    unita: testo('p3d-mu-l'),
    prezzoUnita: testo('p3d-mp-l'),
    titolo: testo('p3d-mat-title'),
    /* La classe `p3-tb` la usano anche le modalità e i modi macchina: le
       schede della tecnologia sono quelle che chiamano `setType`. */
    schede: [].slice.call(document.querySelectorAll('#view-print3d [onclick*="setType"]'))
      .map((b) => b.className.trim()).join(' | '),
    watt: get('p3d-watt'),
    costoMacchina: get('p3d-mc'),
    vita: get('p3d-lh'),
    manutenzione: get('p3d-mnt'),
    falliti: get('p3d-fail'),
    duty: get('p3d-duty'),
    costo: (window.__q.vivo() || {}).costo,
  });
  Print3DQuoter.setType('fdm'); await a(700);
  await window.__q.base();
  const fdm1 = stato();
  Print3DQuoter.setType('resin'); await a(700);
  const resina = stato();
  Print3DQuoter.setType('fdm'); await a(700);
  const fdm2 = stato();
  return { fdm1, resina, fdm2 };
});
dico('FASE 9 · passando a resina cambia l unità di misura ('
  + tecnologia.fdm1.unita + ' → ' + tecnologia.resina.unita + ')',
  /\(g\)/.test(tecnologia.fdm1.unita) && /\(ml\)/.test(tecnologia.resina.unita));
dico('FASE 9b · e cambia il prezzo di riferimento ('
  + tecnologia.fdm1.prezzoUnita + ' → ' + tecnologia.resina.prezzoUnita + ')',
  tecnologia.fdm1.prezzoUnita !== tecnologia.resina.prezzoUnita
  && /L/.test(tecnologia.resina.prezzoUnita));
dico('FASE 9c · la scheda attiva si sposta (' + tecnologia.resina.schede + ')',
  /ares/.test(tecnologia.resina.schede) && !/afdm/.test(tecnologia.resina.schede));
dico('FASE 9d · i watt predefiniti diventano quelli della resina ('
  + tecnologia.fdm1.watt + ' → ' + tecnologia.resina.watt + ')',
  tecnologia.fdm1.watt === '150' && tecnologia.resina.watt === '40');
dico('FASE 9e · e il costo macchina pure (' + tecnologia.fdm1.costoMacchina
  + ' → ' + tecnologia.resina.costoMacchina + ')',
  tecnologia.fdm1.costoMacchina === '420' && tecnologia.resina.costoMacchina === '250');
dico('FASE 9f · così come manutenzione e stampe fallite ('
  + tecnologia.resina.manutenzione + ' €/h · ' + tecnologia.resina.falliti + '%)',
  tecnologia.resina.manutenzione === '0.20' && tecnologia.resina.falliti === '12');
dico('FASE 9g · tornando a FDM tornano i parametri FDM (' + tecnologia.fdm2.watt
  + 'W · ' + tecnologia.fdm2.costoMacchina + '€)',
  tecnologia.fdm2.watt === '150' && tecnologia.fdm2.costoMacchina === '420');
dico('FASE 9h · e l unità torna in grammi (' + tecnologia.fdm2.unita + ')',
  /\(g\)/.test(tecnologia.fdm2.unita));
dico('FASE 9i · nessun costo resta non finito',
  [tecnologia.fdm1, tecnologia.resina, tecnologia.fdm2]
    .every((s) => typeof s.costo === 'number' && isFinite(s.costo) && s.costo >= 0));

/* ── FASE 13 · input assurdi ────────────────────────────────────────────── */
const robustezza = await page.evaluate(async () => {
  const { a, set, tot } = window.__q;
  await window.__q.base();
  const campi = ['p3d-g', 'p3d-h', 'p3d-mkg', 'p3d-watt', 'p3d-kwh', 'p3d-mc', 'p3d-lh',
    'p3d-mnt', 'p3d-fail', 'p3d-setup', 'p3d-oh', 'p3d-qty'];
  const valori = ['0', '', '-5', '3.7', '999999999', 'abc', 'NaN', 'Infinity'];
  const guasti = [];
  for (const c of campi) {
    for (const v of valori) {
      if (!set(c, v)) continue;
      Print3DQuoter.calc();
      await a(45);
      const t = tot();
      const male = [t.costo, t.netto, t.iva, t.lordo, t.listino]
        .some((x) => !isFinite(x) || x < 0);
      if (male) guasti.push(c + '=' + JSON.stringify(v) + ' → ' + JSON.stringify(t));
    }
    set(c, '');
  }
  await window.__q.base();
  return { guasti, provati: campi.length * valori.length };
});
dico('FASE 13 · ' + robustezza.provati + ' combinazioni di input assurdi, nessun NaN, Infinity o prezzo negativo'
  + (robustezza.guasti.length ? ' — ' + robustezza.guasti.slice(0, 3).join(' | ') : ''),
  robustezza.guasti.length === 0);

/* ── FASE 15-18 · preventivo, PDF e WhatsApp dicono lo stesso numero ────── */
const preventivo = await page.evaluate(async () => {
  const { a, tot } = window.__q;
  await window.__q.base();
  Print3DQuoter.clearLines();
  await a(400);
  for (let i = 0; i < 3; i += 1) { Print3DQuoter.addLine(); await a(400); }
  const t = tot();

  /* Il messaggio WhatsApp e il PDF si costruiscono intercettando window.open:
     quel che conta è che il numero dentro sia lo stesso di `totali()`. */
  const apriVero = window.open;
  let url = null; let html = '';
  window.open = function (u) {
    url = String(u || '');
    return { document: { write(x) { html += x; }, close() {} }, focus() {}, print() {} };
  };
  Print3DQuoter.doWa(); await a(300);
  const wa = url;
  url = null; html = '';
  Print3DQuoter.doPdf(); await a(400);
  const pdf = html;
  window.open = apriVero;

  const euro = (s) => (s.match(/[\d.]+,\d{2}|\d+\.\d{2}/g) || []);
  return {
    voci: 3,
    tot: t,
    waTesto: decodeURIComponent((wa || '').replace(/^.*text=/, '')),
    pdfNumeri: euro(pdf).slice(-12),
    pdfLunghezza: pdf.length,
  };
});
const atteso = preventivo.tot.lordo.toFixed(2).replace('.', ',');
dico('FASE 15 · tre voci in preventivo, totale ' + atteso, preventivo.tot.lordo > 0);
dico('FASE 18 · il messaggio WhatsApp riporta lo stesso totale',
  preventivo.waTesto.includes(atteso) || preventivo.waTesto.includes(preventivo.tot.lordo.toFixed(2)));
dico('FASE 17 · il PDF è stato generato e contiene numeri (' + preventivo.pdfLunghezza + ' caratteri)',
  preventivo.pdfLunghezza > 500 && preventivo.pdfNumeri.length > 0);
dico('FASE 17b · e il totale del PDF è quello dello schermo',
  preventivo.pdfNumeri.join(' ').includes(atteso)
  || preventivo.pdfNumeri.join(' ').includes(preventivo.tot.lordo.toFixed(2)));

/* ── FASE 16 · salvataggio e ricaricamento ──────────────────────────────── */
/* `doSave()` esce subito se non ci sono voci: senza una riga nel preventivo il
   collaudo misurerebbe un salvataggio che il codice non ha nemmeno tentato. */
const salvato = await page.evaluate(async () => {
  const { a, set, tot } = window.__q;
  Print3DQuoter.clearLines();
  await a(300);
  await window.__q.base();
  set('p3d-name', 'Collaudo salvataggio');
  Print3DQuoter.addLine();
  await a(600);
  const prima = tot();
  Print3DQuoter.doSave();
  await a(900);
  const archivio = JSON.parse(localStorage.getItem('p3dq_v4') || '{}');
  const saved = archivio.saved || [];
  return {
    prima,
    salvati: saved.length,
    primo: saved[0] ? { id: saved[0].id, n: saved[0].n, righe: (saved[0].lines || []).length,
      total: saved[0].total } : null,
  };
});
dico('FASE 16 · il preventivo si salva (' + salvato.salvati + ' in archivio)', salvato.salvati >= 1);
dico('FASE 16a · con il nome e le righe che aveva ('
  + (salvato.primo ? salvato.primo.n + ' · ' + salvato.primo.righe + ' righe' : '—') + ')',
  !!salvato.primo && salvato.primo.n === 'Collaudo salvataggio' && salvato.primo.righe >= 1);

await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const ricaricato = await page.evaluate(async () => {
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 3500));
  const archivio = JSON.parse(localStorage.getItem('p3dq_v4') || '{}');
  const saved = archivio.saved || [];
  if (!saved.length) return { salvati: 0 };
  /* `loadSaved` prende l'id del preventivo, non la sua posizione nell'elenco. */
  Print3DQuoter.loadSaved(saved[0].id);
  await new Promise((s) => setTimeout(s, 1500));
  return {
    salvati: saved.length,
    nome: (document.getElementById('p3d-name') || {}).value,
    tot: Print3DQuoter._totali(),
    elenco: ((document.getElementById('view-print3d') || document.body).innerText || '')
      .includes('Collaudo salvataggio'),
  };
});
dico('FASE 16b · dopo il ricaricamento l archivio c è ancora (' + ricaricato.salvati + ')',
  ricaricato.salvati >= 1);
dico('FASE 16c · e la pagina elenca il preventivo salvato', ricaricato.elenco === true);
dico('FASE 16d · le righe tornano con lo stesso imponibile ('
  + (ricaricato.tot ? ricaricato.tot.netto.toFixed(2) : '—')
  + ' vs ' + (salvato.primo ? salvato.primo.total.toFixed(2) : '—') + ')',
  !!ricaricato.tot && !!salvato.primo
  && Math.abs(ricaricato.tot.netto - salvato.primo.total) < 0.02);
dico('FASE 16e · e il campo nome riporta il preventivo caricato (' + ricaricato.nome + ')',
  ricaricato.nome === 'Collaudo salvataggio');

console.log('\nSMART QUOTER 3D — I CALCOLI, PREMENDO I PULSANTI\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\ni numeri del 3D reggono ✔\n');
await browser.close();

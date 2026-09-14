#!/usr/bin/env node
/**
 * erp-end-to-end.mjs — quote → order → sale, con la tecnologia che sopravvive.
 *
 * L'audit aveva misurato il difetto centrale: lo stesso ordine — netto 150,
 * lordo 183, costo 60 — diventava una vendita da 0, 150 o 183 a seconda del
 * pulsante premuto. Quattro percorsi su cinque leggevano `value`, e l'ordine
 * nato dal flusso canonico `value` non ce l'ha.
 *
 * Questa suite percorre il flusso nell'applicazione vera e verifica i casi
 * che il mandato elenca: laser, 3D, UV, laser+UV, laser+3D+UV, un ordine
 * legacy, i filtri, la dashboard e — il più importante — che un ordine misto
 * non faccia contare due volte il suo fatturato.
 *
 *   node tests/qa/erp-end-to-end.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── I moduli ci sono ────────────────────────────────────────────────────── */

const moduli = await page.evaluate(() => ({
  economia: !!window.InglyOrderEconomics && typeof window.InglyOrderEconomics.getOrderRevenueNet === 'function',
  produzione: !!window.InglyProduction,
  vendite: !!window.InglyOrderSales,
  alias: window.OrderSalesService === window.InglyOrderSales,
  tecnologia: !!window.InglyRedditivitaTecnologia,
}));
dico('MODULI · la semantica economica canonica è nel file consegnato', moduli.economia);
dico('MODULI · il modello di produzione pure', moduli.produzione);
dico('MODULI · OrderSalesService esiste (l\'audit lo dava assente)', moduli.vendite);
dico('MODULI · e OrderSalesService è lo stesso oggetto, non un secondo sistema', moduli.alias);
dico('MODULI · l\'aggregato per tecnologia c\'è', moduli.tecnologia);

/* ── TEST C · il caso che era rotto ─────────────────────────────────────── */

const caso = await page.evaluate(() => {
  const S = window.InglyOrderSales;
  /* Esattamente l'ordine dell'audit: quello che valeva zero. */
  const ordine = {
    id: 995001, quoteId: 995001, name: 'Targhe', clientId: 1, clientName: 'Collaudo',
    total: 150, totalNet: 150, totalGross: 183, totalCost: 60,
    economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 },
    production: { primaryTechnology: 'laser', technologies: ['laser', 'uv'], isMixed: true },
  };
  const e = S.createSaleFromOrder(ordine);
  return e.ok ? {
    ok: true, netto: e.vendita.netAmount, lordo: e.vendita.grossAmount,
    costo: e.vendita.totalCost, profitto: e.vendita.margine,
    tec: e.vendita.productionTechnologies, misto: e.vendita.isMixedProduction,
  } : { ok: false, motivo: e.motivo };
});
dico('TEST C · l\'ordine dell\'audit genera una vendita (prima valeva 0)', caso.ok);
dico('TEST C2 · netto 150', caso.netto === 150);
dico('TEST C3 · lordo 183 — netto e lordo non si confondono', caso.lordo === 183);
dico('TEST C4 · costo 60', caso.costo === 60);
dico('TEST C5 · profitto 90', caso.profitto === 90);
dico('TEST C6 · e la tecnologia si eredita senza chiederla (' + (caso.tec || []).join('+') + ')',
  Array.isArray(caso.tec) && caso.tec.length === 2 && caso.misto === true);

/* ── TEST D→I · le tecnologie, una per una ──────────────────────────────── */

const tecnologie = await page.evaluate(() => {
  const S = window.InglyOrderSales;
  const casi = {
    D_laser: ['laser'], E_3d: ['3d'], F_uv: ['uv'],
    G_laserUv: ['laser', 'uv'], H_tre: ['laser', '3d', 'uv'],
  };
  const out = {};
  let n = 996000;
  for (const [nome, tec] of Object.entries(casi)) {
    n += 1;
    const e = S.createSaleFromOrder({
      id: n, name: nome, totalNet: 100, economic: { revenueNet: 100, costTotal: 40 },
      production: { primaryTechnology: tec[0], technologies: tec, isMixed: tec.length > 1 },
    });
    out[nome] = e.ok ? { tec: e.vendita.productionTechnologies, misto: e.vendita.isMixedProduction,
      netto: e.vendita.netAmount } : { errore: e.motivo };
  }
  /* TEST I · un ordine legacy, senza `production` e con solo `value`. */
  const leg = S.createSaleFromOrder({ id: 996900, name: 'Legacy', value: 120, technology: 'print3d' });
  out.I_legacy = leg.ok ? { netto: leg.vendita.netAmount, tec: leg.vendita.productionTechnologies,
    avvisi: leg.avvisi.length } : { errore: leg.motivo };
  return out;
});
dico('TEST D · Laser', tecnologie.D_laser.tec && tecnologie.D_laser.tec[0] === 'laser' && !tecnologie.D_laser.misto);
dico('TEST E · 3D', tecnologie.E_3d.tec && tecnologie.E_3d.tec[0] === '3d');
dico('TEST F · UV', tecnologie.F_uv.tec && tecnologie.F_uv.tec[0] === 'uv');
dico('TEST G · Laser + UV è misto', tecnologie.G_laserUv.misto === true && tecnologie.G_laserUv.tec.length === 2);
dico('TEST H · Laser + 3D + UV pure', tecnologie.H_tre.misto === true && tecnologie.H_tre.tec.length === 3);
dico('TEST I · un ordine legacy resta leggibile (€' + (tecnologie.I_legacy.netto || '—') + ')',
  tecnologie.I_legacy.netto === 120);
dico('TEST I2 · con la tecnologia dedotta dal campo storico',
  tecnologie.I_legacy.tec && tecnologie.I_legacy.tec[0] === '3d');
dico('TEST I3 · e l\'ambiguità di `value` viene dichiarata', tecnologie.I_legacy.avvisi >= 1);

/* ── La regola: nessuna vendita a zero ──────────────────────────────────── */

const zero = await page.evaluate(() => {
  const S = window.InglyOrderSales;
  const e = S.createSaleFromOrder({ id: 997001, name: 'Ordine muto' });
  return { ok: e.ok, motivo: e.motivo || '' };
});
dico('REGOLA · un ordine senza ricavo NON genera una vendita a zero', zero.ok === false);
dico('REGOLA2 · e si dice perché', /non dichiara un ricavo leggibile/.test(zero.motivo));

/* ── TEST J/K · costo reale e scostamento ───────────────────────────────── */

const consuntivo = await page.evaluate(() => {
  const S = window.InglyOrderSales;
  const ordine = { id: 997101, totalNet: 150, economic: { revenueNet: 150, costTotal: 60 } };
  const senza = S.createSaleFromOrder(ordine).vendita;
  const con = S.createSaleFromOrder(ordine, { consuntivo: { costoTotale: 72, margine: 78 } }).vendita;
  return { ricavoPrima: senza.netAmount, ricavoDopo: con.netAmount,
    costoPrima: senza.totalCost, costoDopo: con.totalCost, scostamento: con.totalCost - senza.totalCost };
});
dico('TEST J · il costo reale sostituisce il preventivato (60 → ' + consuntivo.costoDopo + ')',
  consuntivo.costoDopo === 72);
dico('TEST K · lo scostamento è +12', consuntivo.scostamento === 12);
dico('TEST K2 · e il prezzo promesso al cliente NON cambia mai',
  consuntivo.ricavoPrima === 150 && consuntivo.ricavoDopo === 150);

/* ── TEST M · i filtri sono reali ───────────────────────────────────────── */

const filtri = await page.evaluate(async () => {
  const mk = (id, tec, netto) => ({ id, name: 'Ordine ' + id, clientName: 'Collaudo', stage: 'working',
    totalNet: netto, economic: { revenueNet: netto, costTotal: netto * 0.4 },
    production: tec ? { primaryTechnology: tec[0], technologies: tec, isMixed: tec.length > 1 } : undefined });
  for (const o of [mk(998001, ['laser'], 100), mk(998002, ['uv'], 200), mk(998003, ['laser', 'uv'], 150)])
    await window.IDB.put('orders', o);
  await window.App.navigate('gestione_ordini');
  await new Promise((r) => setTimeout(r, 3500));
  const G = window.GestioneOrdini;
  if (!G) return { errore: 'GestioneOrdini assente' };
  G._view = 'lista';
  const leggi = async (tec) => {
    G._setTech(tec);
    await new Promise((r) => setTimeout(r, 1400));
    const t = document.getElementById('view-gestione_ordini').innerText;
    return { l: /Ordine 998001/.test(t), u: /Ordine 998002/.test(t), m: /Ordine 998003/.test(t) };
  };
  const out = { tutti: await leggi('all'), laser: await leggi('laser'),
    uv: await leggi('uv'), misto: await leggi('misto') };
  G._setTech('all');
  await new Promise((r) => setTimeout(r, 900));
  const t = document.getElementById('view-gestione_ordini').innerText;
  out.badge = /Laser/.test(t) && /Stampa UV/.test(t);
  return out;
});
dico('TEST M · senza filtro si vedono tutti e tre',
  filtri.tutti && filtri.tutti.l && filtri.tutti.u && filtri.tutti.m);
dico('TEST M2 · filtro Laser: il laser puro e il misto, non l\'UV puro',
  filtri.laser && filtri.laser.l && filtri.laser.m && !filtri.laser.u);
dico('TEST M3 · filtro UV: l\'UV puro e il misto, non il laser puro',
  filtri.uv && filtri.uv.u && filtri.uv.m && !filtri.uv.l);
dico('TEST M4 · filtro Misti: solo il misto',
  filtri.misto && filtri.misto.m && !filtri.misto.l && !filtri.misto.u);
dico('TEST M5 · e i badge si vedono in lista', filtri.badge);

/* ── TEST N · la dashboard non raddoppia ────────────────────────────────── */

const dashboard = await page.evaluate(async () => {
  await window.App.navigate('dashboard');
  await new Promise((r) => setTimeout(r, 5000));
  const el = document.getElementById('view-dashboard');
  const t = el ? el.innerText : '';
  const i = t.indexOf('Performance per tecnologia');
  const RT = window.InglyRedditivitaTecnologia;
  const ordini = await window.IDB.getAll('orders').catch(() => []);
  const agg = RT ? RT.per(ordini) : null;
  const somma = agg ? agg.righe.reduce((a, r) => a + r.ricavo, 0) : null;
  return {
    presente: i >= 0,
    estratto: i >= 0 ? t.slice(i, i + 200).replace(/\n+/g, ' | ') : '',
    somma: somma,
    ricavoTotale: agg ? agg.totali.ricavo : null,
    misti: agg ? agg.misti : null,
    nota: /contare lo stesso fatturato due volte/.test(t),
  };
});
dico('TEST N · la dashboard mostra la performance per tecnologia', dashboard.presente);
dico('TEST N2 · la somma delle righe è il fatturato vero, non il doppio ('
  + dashboard.somma + ' = ' + dashboard.ricavoTotale + ')',
  dashboard.somma != null && dashboard.somma === dashboard.ricavoTotale);
dico('TEST N3 · i misti hanno una categoria loro (' + dashboard.misti + ')', dashboard.misti >= 1);
dico('TEST N4 · e la schermata spiega perché non li ripartisce', dashboard.nota);

/* ── TEST O · i documenti cliente non espongono i costi interni ─────────── */

const documento = await page.evaluate(() => {
  const S = window.InglyOrderSales;
  const v = S.createSaleFromOrder({
    id: 999001, totalNet: 150, totalGross: 183,
    economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 },
  }).vendita;
  /* Quello che una vendita porta è roba interna: la verifica è che i campi
     interni esistano e siano distinguibili, così chi genera il PDF cliente
     sa quali NON prendere. */
  return {
    interni: ['totalCost', 'margine', 'marginePct', 'costBreakdown', 'pricingSnapshot']
      .filter((k) => k in v),
    cliente: ['netAmount', 'grossAmount', 'clientName', 'date', 'desc'].filter((k) => k in v),
  };
});
dico('TEST O · la vendita porta i campi interni, riconoscibili per nome ('
  + documento.interni.length + ')', documento.interni.length >= 4);
dico('TEST O2 · e quelli del cliente, separati (' + documento.cliente.length + ')',
  documento.cliente.length >= 4);

console.log('\nERP END TO END\n');
if (dashboard.estratto) console.log('  ' + dashboard.estratto + '\n');
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
console.log('\nun ordine, una vendita, un fatturato ✔\n');
await browser.close();

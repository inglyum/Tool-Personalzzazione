import path from 'node:path';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const err = []; p.on('pageerror', e => err.push(String(e.message).slice(0,120)));
p.on('dialog', d => d.accept().catch(()=>{}));
await p.addInitScript(() => { ['ingly_wizard_done_v2','ingly_tour_done_v1','_wizard_done_v37','_v37sidebar_done'].forEach(k=>localStorage.setItem(k,'1')); });
await p.goto('file://' + path.resolve('dist/INGLY-OS.html'), { waitUntil:'load', timeout:120000 });
await p.waitForTimeout(18000);
const r = await p.evaluate(() => {
  const out = {};
  // servizi economici canonici
  out.moduli = ['InglyOrderEconomics','InglyProduction','InglyOrderSales','InglyPagamenti',
    'InglyRedditivitaTecnologia','InglyRedditivita','InglyPrevisioni','InglyCostEngine',
    'InglyQuoteAdapter','InglyMachineCost','InglyConsuntivo','InglyOrderFields','InglyFisco',
    'InglyInventoryLedger','InglyInventoryCostResolver','InglyDomain']
    .reduce((a,k)=>{a[k]=!!window[k];return a;},{});
  // funzioni che calcolano un ricavo d'ordine
  out.ricavo = Object.keys(window).filter(k=>/revenue|ricavo/i.test(k));
  // listener sul bus
  try {
    const B = window.Bus;
    out.bus = B && B._handlers ? Object.fromEntries(Object.entries(B._handlers).map(([k,v])=>[k, (v||[]).length])) : 'non ispezionabile';
  } catch(e){ out.bus = 'errore'; }
  // navigazione
  out.nav = { navigate: typeof window.App?.navigate, renderSection: typeof window.App?.renderSection,
    sezioni: document.querySelectorAll('.section-view').length,
    aliases: window.NAV_ALIASES ? Object.keys(window.NAV_ALIASES).length : 'assente' };
  // produzione: forma attuale
  const PM = window.InglyProduction;
  out.produzione = PM ? { api: Object.keys(PM).filter(k=>typeof PM[k]==='function'), tec: PM.TECNOLOGIE ? PM.TECNOLOGIE.length : (PM.elenco?PM.elenco().length:'?') } : null;
  // cost engine: driver
  const CE = window.InglyCostEngine;
  out.costEngine = CE ? Object.keys(CE).filter(k=>typeof CE[k]==='function') : null;
  // consuntivo
  const C = window.InglyConsuntivo;
  out.consuntivo = C ? Object.keys(C).filter(k=>typeof C[k]==='function') : null;
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('ERRORI', err);
await b.close();

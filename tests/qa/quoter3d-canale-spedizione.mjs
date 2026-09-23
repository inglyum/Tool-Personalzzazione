#!/usr/bin/env node
/**
 * quoter3d-canale-spedizione.mjs — il canale di vendita nello Smart Quoter 3D.
 *
 * `InglyCostEngine.prezzo()` separava già commissione di marketplace,
 * commissione di pagamento e spedizione reale vs addebitata: `marketplace-
 * profiles.test.mjs` prova che `InglyMarketplaces` gliele passa giuste. Ma un
 * test a livello di modulo non prova che l'utente le trovi — questo apre la
 * pagina vera, sceglie Etsy dal menu che l'utente vede, e verifica che il
 * riquadro «Canale» compaia e cambi il profitto in pagina, non solo nel
 * motore.
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
  if (typeof Print3DQuoter === 'undefined') { out.errori.push('Print3DQuoter assente'); return out; }
  if (!window.InglyMarketplaces) { out.errori.push('InglyMarketplaces assente'); return out; }

  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d', 'stampa3d', 'smart_quoter_3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await new Promise((s) => setTimeout(s, 900));
    if (document.getElementById('p3d-g')) break;
  }
  dico('la vista del preventivatore 3D si apre', !!document.getElementById('p3d-g'));
  if (!document.getElementById('p3d-g')) return out;

  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
  sv('p3d-watt', 150); sv('p3d-kwh', 0.28); sv('p3d-duty', 0.6);
  sv('p3d-mc', 400); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
  sv('p3d-fail', 7); sv('p3d-lr', 18);
  sv('p3d-qty', 1); sv('p3d-sup', 0);
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 400));

  const testo = (id) => document.getElementById(id)?.textContent || '';

  /* ── La card esiste ed è raggiungibile, non solo scritta nel modulo ────── */
  const select = document.getElementById('p3d-canale');
  dico('il menu del canale è in pagina', !!select);
  if (!select) return out;
  const opzioni = [...select.options].map((o) => o.value).filter(Boolean);
  dico('il menu elenca i marketplace del registro (Etsy incluso)', opzioni.includes('etsy'));
  dico('nessun canale scelto per difetto (non "diretto")', select.value === '');

  /* ── Senza canale: nessuna commissione, nessun riquadro «Canale» ─────── */
  const heroPrima = testo('p3d-hero');
  dico('senza canale, il riquadro «Canale» non compare', !/Canale/i.test(heroPrima) || !/Commission/i.test(heroPrima));

  /* ── Si sceglie Etsy dal menu, come farebbe l'utente ────────────────── */
  select.value = 'etsy';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 500));

  dico('la nota del profilo Etsy compare sotto il menu', /Etsy/i.test(document.querySelector('#view-print3d')?.textContent || '') &&
    /transaction fee|Etsy Payments/i.test(document.querySelector('#view-print3d')?.textContent || ''));

  const heroDopo = testo('p3d-hero');
  dico('con Etsy scelto, il riquadro «Canale» compare nel conto', /Canale/i.test(heroDopo));
  dico('con Etsy scelto, le commissioni sono in pagina', /Commission/i.test(heroDopo));
  dico('«Profitto netto» compare accanto al profitto lordo', /Profitto netto/i.test(heroDopo));

  /* ── La spedizione: costo e addebito sono due numeri distinti ─────────── */
  const spedCosto = document.getElementById('p3d-sped-costo');
  const spedAddeb = document.getElementById('p3d-sped-addeb');
  dico('i due campi di spedizione sono in pagina', !!spedCosto && !!spedAddeb);
  if (spedCosto && spedAddeb) {
    spedCosto.value = '9'; spedCosto.dispatchEvent(new Event('input', { bubbles: true }));
    spedAddeb.value = '5'; spedAddeb.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((s) => setTimeout(s, 400));
    const heroSped = testo('p3d-hero');
    dico('una spedizione in perdita (9€ di costo, 5€ addebitati) si vede nel conto', /Sped/i.test(heroSped));
  }

  /* ── Tornando a "nessuno" e a spedizione zero, il riquadro sparisce ────── */
  select.value = '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  if (spedCosto && spedAddeb) {
    spedCosto.value = '0'; spedCosto.dispatchEvent(new Event('input', { bubbles: true }));
    spedAddeb.value = '0'; spedAddeb.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise((s) => setTimeout(s, 400));
  dico('tornando a "nessuno" e spedizione a zero, le commissioni spariscono', !/Commission/i.test(testo('p3d-hero')));

  return out;
});

console.log('\nSMART QUOTER 3D — canale di vendita e spedizione\n');
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
console.log('\nil canale di vendita arriva fino allo schermo ✔\n');
await browser.close();

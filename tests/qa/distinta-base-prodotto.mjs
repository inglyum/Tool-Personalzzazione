#!/usr/bin/env node
/**
 * distinta-base-prodotto.mjs — un prodotto multi-tecnologia si dichiara
 * una volta, nel catalogo vero.
 *
 * Il catalogo sa scrivere un prodotto con una tecnologia e un materiale
 * soli. Qui si verifica il pannello «🧬 Distinta base» aggiunto alla card
 * prodotto: si collega un materiale vero dal magazzino (non un testo
 * libero), si dichiarano due operazioni (laser + uv, l'anatomia avviamento/
 * per-pezzo separata), si salva, e si controlla che InglyProductBOMStore
 * abbia scritto davvero — poi che riaprire il pannello lo ritrovi, e che
 * salvare una seconda volta crei una nuova versione senza cancellare la
 * prima.
 *
 *   node tests/qa/distinta-base-prodotto.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const PRODUCT_ID = 994001;
const MATERIAL_ID = 994002;

await page.evaluate(async (args) => {
  await IDB.put('catalog', { id: args.productId, name: 'Orologio Multi-Tech Test', category: 'Orologi', costPrice: 10, salePrice: 30, tech: 'laser' });
  await IDB.put('materials', { id: args.materialId, name: 'Legno di noce 4mm' });
}, { productId: PRODUCT_ID, materialId: MATERIAL_ID });

/* ── apre il pannello reale sul prodotto vero ─────────────────────────── */
await page.evaluate(async (id) => { await Catalog.openBOM(id); }, PRODUCT_ID);
await page.waitForTimeout(200);

const primaApertura = await page.evaluate(() => document.getElementById('_bom-modal')?.innerHTML || '');
dico('il pannello Distinta base si apre sul prodotto vero', primaApertura.includes('Orologio Multi-Tech Test'));
dico('dichiara che non c\'è ancora una distinta', primaApertura.includes('Nessuna distinta ancora'));

/* ── click veri: si aggiunge un materiale, collegato all\'articolo vero ── */
await page.click('button[onclick*="_bomAggiungiRiga(\'materiale\')"]');
await page.waitForTimeout(150);
await page.selectOption('#bom-r0-item', `materials:${MATERIAL_ID}`);
await page.fill('#bom-r0-qty', '1');
await page.fill('#bom-r0-scrap', '5');

/* ── e due operazioni: laser (avviamento+per pezzo) e uv ─────────────── */
await page.click('button[onclick*="_bomAggiungiRiga(\'operazione\')"]');
await page.waitForTimeout(150);
await page.fill('#bom-r1-tech', 'laser');
await page.fill('#bom-r1-setup', '10');
await page.fill('#bom-r1-perpz', '2');

await page.click('button[onclick*="_bomAggiungiRiga(\'operazione\')"]');
await page.waitForTimeout(150);
await page.fill('#bom-r2-tech', 'uv');
await page.fill('#bom-r2-setup', '5');
await page.fill('#bom-r2-perpz', '1');

await page.click('button[onclick*="_bomSalva()"]');
await page.waitForTimeout(400);

const dopoSalvataggio = await page.evaluate(async (productId) => {
  const bom = await InglyProductBOMStore.corrente(productId);
  return bom;
}, PRODUCT_ID);

dico('la distinta è stata scritta davvero (non solo nel form)', !!dopoSalvataggio);
dico('nasce in versione 1', dopoSalvataggio?.version === 1);
dico('il materiale è collegato all\'articolo vero (materials:' + MATERIAL_ID + '), non a un testo libero', dopoSalvataggio?.righe?.[0]?.itemKey === 'materials:' + MATERIAL_ID);
dico('lo scarto dichiarato è salvato', dopoSalvataggio?.righe?.[0]?.scrapPct === 5);
dico('le due operazioni sono salvate nell\'ordine giusto', dopoSalvataggio?.righe?.[1]?.technology === 'laser' && dopoSalvataggio?.righe?.[2]?.technology === 'uv');
dico('l\'anatomia avviamento/per-pezzo è preservata (non un solo numero)', dopoSalvataggio?.righe?.[1]?.setupTime === 10 && dopoSalvataggio?.righe?.[1]?.timePerUnit === 2);

/* ── l\'espansione per un ordine reale non raddoppia mai l\'avviamento ──── */
const espansione = await page.evaluate((productId) => {
  return new Promise(async (resolve) => {
    const bom = await InglyProductBOMStore.corrente(productId);
    resolve({
      materiali: InglyProductBOM.espandiMateriali(bom, 20),
      operazioni: InglyProductBOM.espandiOperazioni(bom, 20),
      tecnologie: InglyProductBOM.tecnologie(bom),
    });
  });
}, PRODUCT_ID);
dico('a 20 pezzi il materiale scala linearmente (1×1.05×20=21)', Math.abs(espansione.materiali[0].quantity - 21) < 0.001);
dico('l\'operazione laser a 20 pezzi è 10+2×20=50, non 10×20+2×20', espansione.operazioni[0].estimatedTime === 50);
dico('la distinta dichiara due tecnologie: laser e uv', espansione.tecnologie.join(',') === 'laser,uv');

await page.evaluate(() => document.getElementById('_bom-modal')?.remove());

/* ── riaprire il pannello ritrova la distinta salvata ─────────────────── */
await page.evaluate(async (id) => { await Catalog.openBOM(id); }, PRODUCT_ID);
await page.waitForTimeout(200);
const riaperto = await page.evaluate(() => document.getElementById('_bom-modal')?.innerHTML || '');
dico('riaprendo il pannello la versione salvata si vede', riaperto.includes('Versione 1 salvata'));

/* ── una seconda modifica crea una nuova versione, senza perdere la prima ── */
await page.fill('#bom-r0-qty', '2');
await page.click('button[onclick*="_bomSalva()"]');
await page.waitForTimeout(400);
const dopoSeconda = await page.evaluate(async (productId) => {
  const tutte = await InglyProductBOMStore.delProdotto(productId);
  const corrente = await InglyProductBOMStore.corrente(productId);
  return { numeroVersioni: tutte.length, versioneCorrente: corrente.version, quantitaCorrente: corrente.righe[0].quantityPerPiece };
}, PRODUCT_ID);
dico('la seconda modifica crea la versione 2', dopoSeconda.versioneCorrente === 2);
dico('la versione 1 resta nel registro, non viene cancellata', dopoSeconda.numeroVersioni === 2);
dico('la versione corrente porta il valore nuovo (2)', dopoSeconda.quantitaCorrente === 2);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nDISTINTA BASE PRODOTTO · multi-tecnologia dichiarato una volta\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✘  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nun prodotto multi-tecnologia, dichiarato una volta ✔');

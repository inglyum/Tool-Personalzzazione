#!/usr/bin/env node
/**
 * campo-immagine.mjs — un campo immagine, sei posti.
 *
 * Due difetti misurati prima della correzione:
 *
 *   · `ImageLib.uploadFiles` leggeva le dimensioni da `dataUrl`, una variabile
 *     che nel file non esiste. La promessa veniva rifiutata, la funzione
 *     usciva con un'eccezione e `IDB.put` non veniva mai raggiunto: **nessuna
 *     immagine è mai stata salvata nella libreria**, e la funzione non lo
 *     diceva;
 *   · `QuoterImagePanel` salvava il base64 grezzo, senza ridimensionare: una
 *     foto da telefono finiva intera in `localStorage`.
 *
 * E un terzo trovato strada facendo: `CatalogView` cercava `p.image` mentre i
 * prodotti portano la foto in `photo`, quindi quella griglia non ha mai
 * mostrato una foto.
 *
 *   node tests/qa/campo-immagine.mjs [file]
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
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37'].forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* Un PNG vero, 1×1, per far lavorare il browser sul serio. */
const PNG1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/* ── 1 · IL CAMPO ESISTE ED È SOLO SUO ──────────────────────────────────── */
const base = await page.evaluate(() => {
  if (typeof InglyProductImage === 'undefined') return { assente: true };
  return {
    assente: false,
    haMonta: typeof InglyProductImage.monta === 'function',
    haDaFile: typeof InglyProductImage.daFile === 'function',
    formati: InglyProductImage.FORMATI,
  };
});
dico('il campo immagine è in pagina', !base.assente);
dico('sa montarsi e leggere un file', base.haMonta && base.haDaFile);
dico('accetta i formati che il browser disegna', (base.formati || []).includes('image/png') && (base.formati || []).includes('image/webp'));

/* ── 2 · MONTAGGIO, ANTEPRIMA, SOSTITUZIONE, RIMOZIONE ──────────────────── */
const ciclo = await page.evaluate(async (png) => {
  const n = document.createElement('div');
  n.id = 'prova-campo';
  document.body.appendChild(n);
  const cambi = [];
  const campo = InglyProductImage.monta(n, {
    etichetta: 'Prova',
    onChange: (img) => cambi.push(img ? 'immagine' : 'rimossa'),
  });

  const vuoto = { testo: n.textContent, img: n.querySelectorAll('img').length };

  /* Si passa dal vero percorso: un File finto ma con i metodi giusti. */
  const bin = Uint8Array.from(atob(png.split(',')[1]), (c) => c.charCodeAt(0));
  const f = new File([bin], 'prova.png', { type: 'image/png' });
  const r = await InglyProductImage.daFile(f);
  campo.imposta(r.ok ? r.immagine : null);

  const pieno = {
    img: n.querySelectorAll('img').length,
    alt: (n.querySelector('img') || {}).alt,
    haSostituisci: /Sostituisci/.test(n.textContent),
    haRimuovi: /Rimuovi/.test(n.textContent),
  };

  campo.imposta(null);
  const dopoRimozione = { img: n.querySelectorAll('img').length, valore: campo.valore() };

  /* Due campi nella stessa pagina non devono pestarsi i piedi: era il motivo
     per cui quello vecchio non era riusabile. */
  const n2 = document.createElement('div');
  document.body.appendChild(n2);
  InglyProductImage.monta(n2, { etichetta: 'Secondo' });
  const idFile = [...document.querySelectorAll('input[type=file]')].map((i) => i.id).filter(Boolean);
  const doppioni = idFile.length - new Set(idFile).size;

  n.remove(); n2.remove();
  return { vuoto, pieno, dopoRimozione, letturaOk: r.ok, immagine: r.immagine, doppioni, cambi };
}, PNG1x1);
dico('vuoto invita a trascinare, senza mostrare immagini', ciclo.vuoto.img === 0 && /trascina/i.test(ciclo.vuoto.testo));
dico('un PNG vero viene letto', ciclo.letturaOk === true);
dico('e mostrato in anteprima', ciclo.pieno.img === 1);
dico('con un alt, non muto', (ciclo.pieno.alt || '').length > 0);
dico('offre Sostituisci e Rimuovi solo quando c è un immagine', ciclo.pieno.haSostituisci && ciclo.pieno.haRimuovi);
dico('rimuovendo torna vuoto', ciclo.dopoRimozione.img === 0 && ciclo.dopoRimozione.valore === null);
dico('due campi nella stessa pagina non condividono gli id', ciclo.doppioni === 0);
dico('i metadati ci sono (nome, tipo, peso)',
  ciclo.immagine && ciclo.immagine.nome === 'prova.png' && ciclo.immagine.tipo === 'image/png' && ciclo.immagine.byte > 0);

/* ── 3 · I RIFIUTI SONO DETTI ───────────────────────────────────────────── */
const rifiuti = await page.evaluate(async () => {
  const finto = (nome, tipo, byte) => new File([new Uint8Array(4)], nome, { type: tipo });
  const tiff = await InglyProductImage.daFile(finto('scan.tiff', 'image/tiff'));
  const grande = await InglyProductImage.daFile(finto('foto.png', 'image/png'), { pesoMax: 1 });
  return { tiff, grande };
});
dico('un formato che il canvas non legge viene rifiutato', rifiuti.tiff.ok === false);
dico('e il rifiuto dice cosa fare', (rifiuti.tiff.cosaFare || '').length > 0);
dico('un file oltre il limite viene rifiutato', rifiuti.grande.ok === false);

/* ── 4 · LA LIBRERIA IMMAGINI SALVA DAVVERO ─────────────────────────────── */
const lib = await page.evaluate(async (png) => {
  if (typeof ImageLib === 'undefined') return { assente: true };
  const prima = (await IDB.getAll('image_lib').catch(() => [])).length;
  const bin = Uint8Array.from(atob(png.split(',')[1]), (c) => c.charCodeAt(0));
  const f = new File([bin], 'libreria.png', { type: 'image/png' });
  /* `uploadFiles` vuole un oggetto con `files` e `value`, come un input. */
  await ImageLib.uploadFiles({ files: [f], value: '' });
  const dopo = await IDB.getAll('image_lib').catch(() => []);
  const nostra = dopo.filter((i) => i && i.filename === 'libreria.png')[0];
  return { assente: false, prima, dopo: dopo.length, salvata: !!nostra, larghezza: nostra ? nostra.width : null };
}, PNG1x1);
dico('l upload nella libreria immagini salva davvero', lib.assente || lib.salvata === true);
dico('e la libreria è cresciuta di uno', lib.assente || lib.dopo === lib.prima + 1);
dico('con le dimensioni lette, non a zero', lib.assente || lib.larghezza === 1);

/* ── 5 · IL CAMPO È MONTATO NEI SEI MODULI ──────────────────────────────── */
const dove = [];
for (const [sezione, selettore, nome] of [
  ['print3d', '#p3d-prj-foto', 'Smart Quoter 3D'],
  ['product_builder', '[data-pb-immagine]', 'Product Builder'],
]) {
  const r = await page.evaluate(async ([sezione, selettore]) => {
    App.navigate(sezione);
    await new Promise((s) => setTimeout(s, 2600));
    const n = document.querySelector(selettore);
    return { presente: !!n, riempito: !!n && n.querySelectorAll('input[type=file]').length === 1 };
  }, [sezione, selettore]);
  dove.push([nome, r]);
  dico('il campo è montato in ' + nome, r.presente && r.riempito);
}

/* Quoter e Ordini passano dal pannello condiviso della patch 066. */
const pannello = await page.evaluate(() => ({
  esiste: typeof QuoterImagePanel !== 'undefined',
  usaIlCampo: typeof QuoterImagePanel !== 'undefined' && typeof QuoterImagePanel._montaImmagine === 'function',
  senzaVecchiIdFissi: !document.getElementById('qip-preview-img'),
}));
dico('il pannello di Quoter e Ordini usa il campo condiviso', pannello.esiste && pannello.usaIlCampo);
dico('e non ha più i vecchi elementi con id fissi', pannello.senzaVecchiIdFissi);

const apparel = await page.evaluate(async () => {
  App.navigate('apparel');
  await new Promise((s) => setTimeout(s, 2600));
  ApparelQuoter.goProducts();
  await new Promise((s) => setTimeout(s, 900));
  ApparelQuoter.openProdModal(null);
  await new Promise((s) => setTimeout(s, 900));
  const n = document.getElementById('aq-p-img');
  const ok = !!n && n.querySelectorAll('input[type=file]').length === 1;
  const m = document.getElementById('aq-prod-modal'); if (m) m.remove();
  return ok;
});
dico('il campo è montato in Apparel', apparel);

/* ── 6 · IL CATALOGO MOSTRA LA FOTO CHE HA ──────────────────────────────── */
const cat = await page.evaluate(async (png) => {
  await IDB.put('catalog', { id: 'qa-foto-1', name: 'Prodotto con foto', photo: png, salePrice: 10, category: 'Prova' });
  try { AppStore.invalidate('catalog'); } catch (e) {}
  if (typeof CatalogView === 'undefined') return { assente: true };
  CatalogView.open();
  await new Promise((s) => setTimeout(s, 1200));
  const griglia = document.getElementById('catalog-view-grid');
  const immagini = griglia ? [...griglia.querySelectorAll('img')] : [];
  const nostra = immagini.filter((i) => i.src === png).length;
  const m = document.getElementById('catalog-fullscreen'); if (m) m.remove();
  return { assente: false, immagini: immagini.length, nostra };
}, PNG1x1);
dico('la griglia del catalogo mostra la foto dei prodotti che ce l hanno',
  cat.assente || cat.nostra === 1);

console.log('\nCAMPO IMMAGINE — UNO, SEI POSTI\n');
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
console.log('\nun campo, sei posti ✔\n');
await browser.close();

#!/usr/bin/env node
/**
 * template-preventivo.mjs — il giro si chiude anche nel prodotto.
 *
 * I test unitari provano che il modulo conserva tutto. Questo prova che è
 * **collegato**: che premere «Salva Template» salva davvero l'intero lavoro e
 * che «Usa» lo rimette com'era.
 *
 * La prova che conta è il confronto: si costruisce un preventivo con IVA,
 * spedizione, commissioni e sconto, lo si salva, si azzera tutto, si ricarica,
 * e il totale deve tornare lo stesso.
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
  const M = window.InglyQuoteTemplates;
  if (!M) { out.errori.push('InglyQuoteTemplates assente'); return out; }

  await App.navigate('quoter');
  await new Promise((s) => setTimeout(s, 1500));

  /* ── 1. Un preventivo vero, con tutto ─────────────────────────────────── */
  Quoter.lines = [
    { id: 1, name: 'Targa incisa', desc: 'Targa incisa', cat: 'laser', catLabel: 'Laser', detail: '12 min', unit: 'pz', qty: 30, unitCost: 2.4, subtotal: 72, itemId: 7, itemStore: 'items', itemKey: 'items:7' },
    { id: 2, name: 'MDF 3mm', desc: 'MDF 3mm', cat: 'materiale', catLabel: 'Materiale', unit: 'fogli', qty: 6, unitCost: 1.8, subtotal: 10.8 },
  ];
  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; } };
  sv('qr-markup', 160); sv('qr-discount', 8);
  Quoter._ivaMode = true;
  Quoter.renderLines();
  await new Promise((s) => setTimeout(s, 400));

  const prima = Quoter._calcola({ setupCost: 0 });
  dico('il preventivo di partenza è calcolabile', !prima.indisponibile);

  /* ── 2. Il pulsante apre la finestra, e la finestra mostra il conto ───── */
  await QuoterTemplates.openSave();
  await new Promise((s) => setTimeout(s, 400));
  const modaleSalva = document.getElementById('modal-qt-save');
  dico('«Salva Template» apre la finestra', getComputedStyle(modaleSalva).opacity > 0.5);
  const prev = document.getElementById('qt-save-preview')?.innerHTML || '';
  dico('l\'anteprima mostra voci, pezzi e costo', /2 voci · 36 pezzi/.test(prev));
  dico('e dichiara quante impostazioni conserva', /impostazioni economiche/.test(prev));
  dico('e che le righe restano collegate al magazzino', /collegate al magazzino/.test(prev));
  dico('le categorie sono nel menu', (document.getElementById('qt-save-cat')?.options.length || 0) === M.CATEGORIE.length);

  /* ── 3. Il salvataggio conserva tutto ─────────────────────────────────── */
  document.getElementById('qt-save-name').value = 'QA · Targhe premiazione';
  document.getElementById('qt-save-cat').value = 'laser';
  document.getElementById('qt-save-desc').value = 'ASD, 30 pz';
  await QuoterTemplates.save();
  await new Promise((s) => setTimeout(s, 400));

  const salvati = (await IDB.getAll('quote_templates')).filter((t) => String(t.name).startsWith('QA ·'));
  dico('il template è nell\'archivio', salvati.length === 1);
  if (!salvati.length) return out;
  const tpl = salvati[0];
  dico('porta lo schema nuovo', tpl.schemaVersion === M.SCHEMA);
  dico('conserva più di dieci impostazioni economiche', Object.keys(tpl.pricing).length >= 10);
  dico('conserva la categoria e la descrizione', tpl.category === 'laser' && tpl.desc === 'ASD, 30 pz');
  dico('conserva il collegamento al magazzino', tpl.lines[0].itemKey === 'items:7');

  /* ── 4. Si azzera tutto, come se fosse un altro giorno ────────────────── */
  Quoter.lines = [];
  sv('qr-markup', 100); sv('qr-discount', 0);
  Quoter._ivaMode = false;
  Quoter.renderLines();
  await new Promise((s) => setTimeout(s, 300));
  dico('il preventivo è stato azzerato', (Quoter.lines || []).length === 0);

  /* ── 5. Si ricarica, e deve tornare com'era ───────────────────────────── */
  await QuoterTemplates.openLoad();
  await new Promise((s) => setTimeout(s, 400));
  const modaleCarica = document.getElementById('modal-qt-load');
  dico('«Template» apre l\'elenco', getComputedStyle(modaleCarica).opacity > 0.5);
  const lista = document.getElementById('qt-load-list')?.textContent || '';
  dico('l\'elenco mostra il template appena salvato', /QA · Targhe premiazione/.test(lista));
  dico('con voci, pezzi, costo e impostazioni', /2 voci · 36 pz/.test(lista) && /impostazioni/.test(lista));
  dico('e la barra delle categorie', (document.getElementById('qt-load-cats')?.children.length || 0) >= 2);

  /* la ricerca */
  QuoterTemplates._cerca('targhe');
  await new Promise((s) => setTimeout(s, 200));
  dico('la ricerca trova il template', /QA · Targhe/.test(document.getElementById('qt-load-list').textContent));
  QuoterTemplates._cerca('qualcosa-che-non-esiste');
  await new Promise((s) => setTimeout(s, 200));
  dico('e quando non trova niente lo dice', /Nessun template corrisponde/.test(document.getElementById('qt-load-list').textContent));
  QuoterTemplates._cerca('');

  await QuoterTemplates.load(tpl.id);
  await new Promise((s) => setTimeout(s, 500));

  dico('le voci tornano tutte', (Quoter.lines || []).length === 2);
  dico('con quantità e costi identici', Quoter.lines.map((l) => l.qty + '@' + l.unitCost).join(',') === '30@2.4,6@1.8');
  dico('il collegamento al magazzino sopravvive', Quoter.lines[0].itemKey === 'items:7');
  dico('il ricarico torna quello salvato', +document.getElementById('qr-markup').value === 160);
  dico('lo sconto torna quello salvato', +document.getElementById('qr-discount').value === 8);
  dico('l\'IVA torna quella salvata', Quoter._ivaMode === true);

  const dopo = Quoter._calcola({ setupCost: 0 });
  dico('e il totale è lo stesso di prima (' + prima.totalGross.toFixed(2) + ')',
    Math.abs(dopo.totalGross - prima.totalGross) < 0.01);
  dico('anche il margine', Math.abs(dopo.marginPct - prima.marginPct) < 0.01);

  /* ── 6. L'uso viene contato ───────────────────────────────────────────── */
  const riletto = await IDB.get('quote_templates', tpl.id);
  dico('l\'uso viene registrato', riletto.usoConteggio === 1 && !!riletto.usatoIl);

  /* ── 7. Un template senza voci non si salva ───────────────────────────── */
  Quoter.lines = [];
  await QuoterTemplates.openSave();
  document.getElementById('qt-save-name').value = 'QA · vuoto';
  await QuoterTemplates.save();
  await new Promise((s) => setTimeout(s, 300));
  const vuoti = (await IDB.getAll('quote_templates')).filter((t) => t.name === 'QA · vuoto');
  dico('un template senza voci viene rifiutato', vuoti.length === 0);
  closeModal('qt-save');

  /* ── 8. Pulizia ───────────────────────────────────────────────────────── */
  try {
    for (const t of await IDB.getAll('quote_templates')) {
      if (String(t.name).startsWith('QA ·')) await IDB.del('quote_templates', t.id);
    }
  } catch (e) { /* la pulizia non è la prova */ }

  return out;
});

console.log('\nTEMPLATE DI PREVENTIVO — si salva il lavoro, non le righe\n');
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
console.log('\nil template rimette il lavoro com\'era ✔\n');
await browser.close();

#!/usr/bin/env node
/**
 * storico-economico.mjs — la prova nel prodotto vero, non nei sorgenti.
 *
 * I test unitari provano che il modulo congela. Questo prova una cosa che
 * quelli non possono provare: che il modulo è **collegato**. Un contratto
 * perfetto e mai chiamato passerebbe tutti i test unitari del mondo e non
 * conserverebbe un solo ordine.
 *
 * Il percorso è quello dell'utente, dentro il file consegnato:
 *
 *     salva un preventivo → conferma → cambia il listino → riapri l'ordine
 *
 * e la domanda è sempre la stessa: il conto di allora è ancora quello di
 * allora?
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const problemi = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => problemi.push('errore JS: ' + e.message));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(9000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });

  if (!window.InglyOrderSnapshot) { out.errori.push('InglyOrderSnapshot assente'); return out; }
  if (!window.InglyQuoteAdapter) { out.errori.push('InglyQuoteAdapter assente'); return out; }
  if (!window.InglyOrderEconomics) { out.errori.push('InglyOrderEconomics assente'); return out; }

  const S = window.InglyOrderSnapshot;
  const A = window.InglyQuoteAdapter;

  /* ── 1. Un preventivo, con lo stato di prezzo che il quoter costruisce ── */
  const righe = [
    { id: 1, name: 'Targa incisa', unit: 'pz', qty: 30, unitCost: 2.4, subtotal: 72 },
    { id: 2, name: 'MDF 3mm', unit: 'fogli', qty: 6, unitCost: 1.8, subtotal: 10.8 },
  ];
  const stato = { lines: righe, strategia: 'ricarico', markup: 2, discountPct: 5, vatPct: 22, setupCost: 20 };
  const calcolo = A.calculateQuote(stato);
  if (calcolo.indisponibile) { out.errori.push('il motore non ha calcolato'); return out; }

  const q = {
    id: 900001, name: 'QA storico economico', clientName: 'QA', clientId: null,
    date: new Date().toISOString().slice(0, 10), lines: righe,
    totalCost: +calcolo.totalCost.toFixed(2),
    netPrice: +calcolo.subtotalNet.toFixed(2),
    grossPrice: +calcolo.totalGross.toFixed(2),
    markup: 1, markupPct: 100, discount: 5, ivaMode: true,
    status: 'in_attesa', category: 'Quoter',
    economicSnapshot: S.costruisci(calcolo, { spiegazione: A.explainQuote(stato) }),
  };
  dico('lo snapshot nasce alla quotazione', q.economicSnapshot.stato === 'SNAPSHOT');
  dico('porta la versione del motore', q.economicSnapshot.costEngineVersion === window.InglyCostEngine.version);
  await IDB.put('quotes', q);

  /* ── 2. La conferma, con il percorso reale del prodotto ──────────────── */
  const originale = window.askConfirm;
  window.askConfirm = async () => true;
  let esitoConferma = null;
  try { esitoConferma = await Pipeline.confirm(900001); }
  catch (e) { out.errori.push('Pipeline.confirm ha lanciato: ' + e.message); }
  finally { window.askConfirm = originale; }
  if (!esitoConferma) { out.errori.push('la conferma non ha prodotto un ordine'); return out; }

  const ordini = await IDB.getAll('orders');
  const ordine = ordini.find((o) => String(o.id) === String(esitoConferma.orderId));
  if (!ordine) { out.errori.push('ordine non trovato dopo la conferma'); return out; }

  dico('l\'ordine porta lo snapshot', S.classifica(ordine) === 'SNAPSHOT');
  dico('lo snapshot ha le righe', (ordine.economicSnapshot.lines || []).length === 2);
  dico('il registro economico ha ORDER_CONFIRMED',
    (ordine.economicLog || []).some((e) => e.action === 'ORDER_CONFIRMED'));

  const impronta = JSON.stringify(ordine.economicSnapshot);
  const margineAllora = ordine.economicSnapshot.totals.marginPct;

  /* ── 3. Il mondo cambia: il materiale rincara del 40% ─────────────────── */
  const nuoveRighe = righe.map((r) => ({ ...r, unitCost: r.unitCost * 1.4, subtotal: r.subtotal * 1.4 }));
  const oggi = A.calculateQuote({ ...stato, lines: nuoveRighe });
  dico('controllo negativo: il ricalcolo dà un numero diverso',
    Math.abs(oggi.marginPct - margineAllora) > 0.01 || Math.abs(oggi.totalCost - ordine.economicSnapshot.totals.totalCost) > 0.01);

  /* ── 4. Si riapre l'ordine ─────────────────────────────────────────────── */
  const riletti = await IDB.getAll('orders');
  const riletto = riletti.find((o) => String(o.id) === String(esitoConferma.orderId));
  const letto = S.leggi(riletto);
  dico('la rilettura è ancora uno storico', letto.stato === 'SNAPSHOT');
  dico('lo storico non si è mosso', JSON.stringify(letto.snapshot) === impronta);
  dico('lo storico riletto è congelato', Object.isFrozen(letto.snapshot) && Object.isFrozen(letto.snapshot.totals));

  /* ── 5. Il pannello disegna, e disegna i numeri di allora ─────────────── */
  const html = window.InglyOrderEconomics.pannello(riletto);
  const atteso = '€ ' + (Math.round(letto.snapshot.totals.totalGross * 100) / 100).toFixed(2);
  dico('il pannello mostra il prezzo congelato', html.includes(atteso));
  dico('il pannello dichiara che è uno storico', html.includes('Aperto come storico'));
  dico('il pannello offre il ricalcolo esplicito', html.includes('chiediRicalcolo'));

  /* ── 6. Un ordine anteriore alla fase ─────────────────────────────────── */
  const vecchio = { id: 900002, name: 'Ordine storico', value: 340, status: 'done' };
  const lettoVecchio = S.leggi(vecchio);
  dico('un ordine legacy è classificato, non ricostruito', lettoVecchio.stato === 'LEGACY_NO_SNAPSHOT');
  const htmlVecchio = window.InglyOrderEconomics.pannello(vecchio);
  dico('e il pannello lo dice a parole', htmlVecchio.includes('Dati economici storici non disponibili'));
  /* La parola «margine» compare, e deve comparire: la nota dice che il
     margine *non* era stato conservato. Quello che non deve esserci è un
     margine **in cifre** — è la differenza fra spiegare un'assenza e
     riempirla. */
  dico('senza inventare un margine in cifre', !/\d[\d.,]*\s*%/.test(htmlVecchio));
  dico('mostra il totale storico per quello che è',
    htmlVecchio.includes('€ 340.00') && htmlVecchio.includes('un totale, non un conto'));

  /* ── Pulizia: la QA non lascia dati nel database ──────────────────────── */
  try {
    await IDB.del('quotes', 900001);
    await IDB.del('orders', esitoConferma.orderId);
    if (esitoConferma.saleId) await IDB.del('sales', esitoConferma.saleId);
  } catch (e) { /* la pulizia non è la prova */ }

  return out;
});

console.log('\nSTORICO ECONOMICO — il percorso dell\'utente nel file consegnato\n');
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));

console.log('\nerrori JavaScript: ' + problemi.filter((p) => p.startsWith('errore JS')).length);

if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nil conto di allora è ancora quello di allora ✔\n');
await browser.close();

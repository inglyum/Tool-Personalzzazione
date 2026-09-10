#!/usr/bin/env node
/**
 * politiche-prezzo.mjs — i margini si raggiungono, si cambiano, e un prodotto
 * può dichiarare il suo.
 *
 * Misurato prima di questo lavoro: le sette politiche di prezzo esistevano nel
 * motore, `InglyPricingPolicies` aveva `imposta()` e `ripristina()` dal primo
 * giorno, e `grep` trovava **un solo consumatore** in tutta l'applicazione —
 * nessuna schermata. Un margine che il programma sa usare e che l'utente non
 * può cambiare vale quanto un margine che non c'è.
 *
 * E il ricalcolo del listino applicava un margine solo a tutti i prodotti.
 *
 * Qui si fa il giro come lo farebbe una persona: apro il pannello, cambio un
 * margine, salvo, apro un prodotto, gli do una politica, lancio il ricalcolo
 * e guardo se il suo prezzo è diverso dagli altri.
 *
 *   node tests/qa/politiche-prezzo.mjs [file]
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

/* ── FASE A · la scheda esiste e mostra le politiche del motore ───────────── */

const pannello = await page.evaluate(async () => {
  window.InglyProfiliEconomici.apri('politiche');
  await new Promise((r) => setTimeout(r, 1500));
  const n = document.querySelector('#ingly-profili-economici');
  if (!n) return null;
  return {
    schede: [...n.querySelectorAll('[data-tab]')].map((b) => b.getAttribute('data-tab')),
    campi: n.querySelectorAll('[data-campo^="politiche."]').length,
    esempio: /100 € di costo/.test(n.textContent),
    distingue: /costa/.test(n.textContent) && /guadagnare/.test(n.textContent),
  };
});
dico('FASE A · il pannello ha la scheda dei margini',
  pannello && pannello.schede.indexOf('politiche') >= 0);
dico('FASE A2 · con le sette politiche, tre campi ciascuna (' + (pannello ? pannello.campi : '—') + ')',
  pannello && pannello.campi === 21);
dico('FASE A3 · e mostra cosa diventa un costo di 100 €', pannello && pannello.esempio);
dico('FASE A4 · e distingue quello che costa da quello che si guadagna',
  pannello && pannello.distingue);

/* ── FASE B · cambiare un margine e salvarlo ──────────────────────────────── */

/* 77 non è il margine di nessuna politica: se ricompare da qualche parte, ci è
   arrivato da qui e non da un predefinito. */
const NUOVO = 77;

const salvato = await page.evaluate(async (v) => {
  const n = document.querySelector('#ingly-profili-economici');
  const campo = n.querySelector('[data-campo="politiche.4.marginTarget"]');   // premium
  if (!campo) return null;
  const prima = window.InglyPricingPolicies.perId('premium').marginTarget;
  campo.value = String(v);
  campo.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 400));
  n.querySelector('[data-azione="salva"]').click();
  await new Promise((r) => setTimeout(r, 1400));
  return { prima, dopo: window.InglyPricingPolicies.perId('premium').marginTarget };
}, NUOVO);
dico('FASE B · il margine cambiato si salva (' + (salvato ? salvato.prima + ' → ' + salvato.dopo : '—') + ')',
  salvato && salvato.dopo === NUOVO);

const sopravvive = await page.evaluate(() => {
  /* Si rilegge dall'archivio, non dalla memoria della pagina: senza questo,
     un salvataggio che non ha scritto niente sembrerebbe riuscito. */
  const raw = localStorage.getItem(window.InglyPricingPolicies.CHIAVE);
  const o = raw ? JSON.parse(raw) : {};
  return o.premium ? o.premium.marginTarget : null;
});
dico('FASE B2 · e arriva davvero in archivio (' + sopravvive + ')', sopravvive === NUOVO);

const nonToccate = await page.evaluate(() => {
  /* Le politiche non toccate non devono finire in archivio: conservarle
     identiche al predefinito le congelerebbe al giorno del salvataggio. */
  const raw = localStorage.getItem(window.InglyPricingPolicies.CHIAVE);
  const o = raw ? JSON.parse(raw) : {};
  return Object.keys(o);
});
dico('FASE B3 · e solo quella toccata è in archivio (' + nonToccate.join(', ') + ')',
  nonToccate.length === 1 && nonToccate[0] === 'premium');

/* ── FASE C · il prodotto dichiara la sua politica ────────────────────────── */

const scheda = await page.evaluate(async () => {
  window.App.navigate('catalog');
  await new Promise((r) => setTimeout(r, 2000));
  await window.Catalog.openModal();
  await new Promise((r) => setTimeout(r, 1600));
  const sel = document.getElementById('cat-politica');
  const nota = document.getElementById('cat-politica-nota');
  if (!sel) return null;
  const opzioni = [...sel.options].map((o) => o.value);
  sel.value = 'premium';
  sel.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 300));
  return { opzioni, nota: nota ? nota.textContent : '' };
});
dico('FASE C · la scheda prodotto ha la tendina delle politiche', scheda && scheda.opzioni.length === 8);
dico('FASE C2 · con la voce «generale» in testa', scheda && scheda.opzioni[0] === '');
dico('FASE C3 · e dice cosa cambia sceglierne una (' + (scheda ? scheda.nota.slice(0, 46) : '—') + '…)',
  scheda && /77%/.test(scheda.nota));

/* ── FASE D · il ricalcolo usa la politica del prodotto ───────────────────── */

const ricalcolo = await page.evaluate(() => {
  const R = window.InglyCatalogRicalcolo;
  const politiche = window.InglyPricingPolicies.elenco();
  const prod = [
    { id: 1, name: 'Generale', costPrice: 10, salePrice: 0 },
    { id: 2, name: 'Premium', costPrice: 10, salePrice: 0, pricingPolicyId: 'premium' },
    { id: 3, name: 'Ingrosso', costPrice: 10, salePrice: 0, cost_profile_id: 'wholesale' },
    { id: 4, name: 'Inventata', costPrice: 10, salePrice: 0, pricingPolicyId: 'inesistente' },
  ];
  return R.proposta(prod, { marginePct: 45, arrotondamento: 'nessuno', politiche })
    .righe.map((r) => ({ nome: r.nome, mg: r.marginePctUsata, fonte: r.fontePolitica, prezzo: r.prezzoNuovo }));
});
const perNome = {};
ricalcolo.forEach((r) => { perNome[r.nome] = r; });

dico('FASE D · il prodotto senza politica usa il margine generale (' + perNome.Generale.mg + '%)',
  perNome.Generale.mg === 45 && perNome.Generale.fonte === 'generale');
dico('FASE D2 · quello Premium usa il margine appena cambiato (' + perNome.Premium.mg + '%)',
  perNome.Premium.mg === NUOVO && perNome.Premium.fonte === 'prodotto');
dico('FASE D3 · «cost_profile_id» vale come sinonimo (' + perNome.Ingrosso.mg + '%)',
  perNome.Ingrosso.mg === 20 && perNome.Ingrosso.fonte === 'prodotto');
dico('FASE D4 · una politica inesistente non si sostituisce in silenzio',
  perNome.Inventata.fonte === 'sconosciuta' && perNome.Inventata.mg === 45);
dico('FASE D5 · e i prezzi proposti sono davvero diversi fra loro ('
  + ricalcolo.map((r) => r.prezzo).join(' · ') + ')',
  new Set(ricalcolo.map((r) => r.prezzo)).size >= 3);

/* ── FASE E · il ricalcolo vero, dal catalogo ─────────────────────────────── */

/* Fin qui si è chiamato il modulo. Qui si apre la finestra che l'utente apre,
   perché una vista che non passa le politiche al modulo darebbe comunque i
   numeri di prima. */
const finestra = await page.evaluate(async () => {
  await window.Catalog.chiudiRicalcolo?.();
  const modale = document.getElementById('modal-catalog');
  if (modale) modale.classList.remove('active');
  await window.IDB.put('catalog', { id: 900001, name: 'Collaudo generale', costPrice: 10, salePrice: 1, active: true });
  await window.IDB.put('catalog', { id: 900002, name: 'Collaudo premium', costPrice: 10, salePrice: 1, active: true, pricingPolicyId: 'premium' });
  await window.Catalog.apriRicalcolo();
  await new Promise((r) => setTimeout(r, 2200));
  const corpo = document.getElementById('cat-ric-corpo');
  const testo = corpo ? corpo.textContent : '';
  const st = window.Catalog._ricalcolo;
  const righe = (st && st.proposta ? st.proposta.righe : [])
    .filter((r) => String(r.id).indexOf('90000') === 0)
    .map((r) => ({ nome: r.nome, mg: r.marginePctUsata, prezzo: r.prezzoNuovo }));
  await window.Catalog.chiudiRicalcolo();
  await window.IDB.del('catalog', 900001).catch(() => {});
  await window.IDB.del('catalog', 900002).catch(() => {});
  return { colonna: /Politica/i.test(testo), righe };
});
dico('FASE E · la finestra del ricalcolo ha la colonna della politica', finestra.colonna);
const g = finestra.righe.filter((r) => /generale/i.test(r.nome))[0];
const pr = finestra.righe.filter((r) => /premium/i.test(r.nome))[0];
dico('FASE E2 · e la vista passa le politiche al modulo ('
  + (g ? g.mg : '—') + '% contro ' + (pr ? pr.mg : '—') + '%)',
  g && pr && g.mg !== pr.mg && pr.mg === NUOVO);

/* ── FASE F · si torna indietro ───────────────────────────────────────────── */

const ripristinato = await page.evaluate(async () => {
  window.InglyProfiliEconomici.apri('politiche');
  await new Promise((r) => setTimeout(r, 1400));
  const n = document.querySelector('#ingly-profili-economici');
  const b = n.querySelector('[data-azione="ripristina-politiche"]');
  if (!b) return null;
  b.click();
  await new Promise((r) => setTimeout(r, 800));
  const dopo = window.InglyPricingPolicies.perId('premium').marginTarget;
  const raw = localStorage.getItem(window.InglyPricingPolicies.CHIAVE);
  window.InglyProfiliEconomici.chiudi();
  return { dopo, archivio: raw ? Object.keys(JSON.parse(raw)).length : 0 };
});
dico('FASE F · «riporta ai valori del motore» funziona (' + (ripristinato ? ripristinato.dopo : '—') + '%)',
  ripristinato && ripristinato.dopo === 60);
dico('FASE F2 · e l\'archivio resta pulito (' + (ripristinato ? ripristinato.archivio : '—') + ' voci)',
  ripristinato && ripristinato.archivio === 0);

console.log('\nMARGINI — SI RAGGIUNGONO, SI CAMBIANO, E OGNI PRODOTTO PUÒ AVERE IL SUO\n');
ricalcolo.forEach((r) => {
  console.log('  ' + r.nome.padEnd(12) + String(r.mg).padStart(3) + '%  '
    + (r.prezzo == null ? '—' : '€ ' + r.prezzo.toFixed(2)).padStart(9) + '   ' + r.fonte);
});
console.log('');

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
console.log('\nogni prodotto può avere il suo margine ✔\n');
await browser.close();

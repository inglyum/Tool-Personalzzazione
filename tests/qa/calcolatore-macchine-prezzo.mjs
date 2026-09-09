#!/usr/bin/env node
/**
 * calcolatore-macchine-prezzo.mjs — il prezzo del Calcolatore Macchine.
 *
 * Prima di questo lavoro la route `lasercalc` decideva il prezzo così:
 *
 *     prezzo = costo unitario × ricarico × (1 − sconto/100)
 *
 * Tre moltiplicazioni e nient'altro. Il motore dei costi, le politiche di
 * prezzo e il pavimento di margine — che il resto dell'applicazione usa —
 * non venivano mai chiamati. Con ricarico 2,2 e sconto 60% il prezzo usciva
 * sotto il costo: la riga mostrava il margine negativo e lo vendeva lo stesso.
 *
 * Questa suite verifica che il conto sia lo stesso di prima quando nessuno
 * chiede sconti impossibili, e che diventi diverso — e giusto — quando li
 * chiede.
 *
 *   node tests/qa/calcolatore-macchine-prezzo.mjs [file]
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

await page.evaluate(async () => {
  App.navigate('lasercalc');
  await new Promise((s) => setTimeout(s, 3000));
});

/* ── La schermata esiste e i controlli nuovi ci sono ─────────────────────── */
const controlli = await page.evaluate(() => {
  const el = document.getElementById('view-lasercalc');
  return {
    disegnata: !!(el && el.querySelector('#_f_mk2')),
    politica: !!(el && el.querySelector('#_f_pol')),
    opzioni: el && el.querySelector('#_f_pol')
      ? [...el.querySelectorAll('#_f_pol option')].map((o) => o.value) : [],
    modulo: typeof window.CalcMacchine,
  };
});
dico('la schermata si disegna con i campi di prezzo', controlli.disegnata);
dico('c è un selettore di politica di prezzo (' + controlli.opzioni.length + ' opzioni)',
  controlli.politica && controlli.opzioni.length >= 3);
dico('e le politiche vengono dal motore, non da un elenco locale ('
  + controlli.opzioni.slice(0, 4).join(' · ') + ')',
  controlli.opzioni.includes('standard'));

/* ── Il caso: senza sconto il prezzo è il ricarico, come sempre ──────────── */
const misura = (campi) => page.evaluate(async (c) => {
  const el = document.getElementById('view-lasercalc');
  const set = (id, v) => {
    const e = el.querySelector('#' + id);
    if (!e) return false;
    e.value = String(v);
    e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    return true;
  };
  for (const [id, v] of Object.entries(c)) set(id, v);
  await new Promise((s) => setTimeout(s, 500));
  const r = window.CalcMacchine._getCurrentResult();
  if (!r) return null;
  const t = (x) => Math.round(x * 1000) / 1000;
  return {
    costo: t(r.unitCost),
    p1: t(r.p1), p2: t(r.p2), p3: t(r.p3),
    m1: r.m1pct, m2: r.m2pct, m3: r.m3pct,
    pav: [r.pav1, r.pav2, r.pav3],
    disc: r.disc, scontoChiesto: r.scontoChiesto,
    politica: r.pol ? r.pol.id : null,
    pavimentoPct: r.pol ? r.pol.floorMargin : null,
    scontoMax: r.pol ? r.pol.maxDiscount : null,
  };
}, campi);

const base = await misura({ _f_pol: 'standard', _f_disc: 0, _f_mk1: 3.5, _f_mk2: 2.8, _f_mk3: 2.2, _f_qty: 1 });
dico('FASE A · il calcolo risponde (costo € ' + (base && base.costo) + ')', base && base.costo > 0);
dico('FASE A2 · senza sconto il prezzo resta costo × ricarico (€ ' + base.costo
  + ' × 2,8 = € ' + Math.round(base.costo * 2.8 * 100) / 100 + ' vs € ' + base.p2 + ')',
  Math.abs(base.p2 - base.costo * 2.8) < 0.02);
dico('FASE A3 · e il margine mostrato è il margine, non il ricarico (×2,8 → '
  + base.m2 + '%, non 180%)', base.m2 >= 63 && base.m2 <= 65);
dico('FASE A4 · nessun pavimento scatta quando non serve', base.pav.every((x) => !x));

/* ── Lo sconto: la politica lo limita, e lo dichiara ─────────────────────── */
const scontone = await misura({ _f_disc: 60 });
dico('FASE B · uno sconto oltre il massimo viene ridotto, non ignorato ('
  + scontone.scontoChiesto + '% chiesto → ' + scontone.disc + '% applicato, max '
  + scontone.scontoMax + '%)',
  scontone.scontoChiesto === 60 && scontone.disc === scontone.scontoMax);
dico('FASE B2 · e nessuno dei tre prezzi scende sotto il costo (€ ' + scontone.costo
  + ' vs ' + [scontone.p1, scontone.p2, scontone.p3].map((p) => '€' + p).join(' · ') + ')',
  [scontone.p1, scontone.p2, scontone.p3].every((p) => p > scontone.costo));
dico('FASE B3 · nessun margine è negativo ('
  + [scontone.m1, scontone.m2, scontone.m3].join('% · ') + '%)',
  [scontone.m1, scontone.m2, scontone.m3].every((m) => m > 0));
dico('FASE B4 · e nessuno scende sotto il pavimento della politica ('
  + scontone.pavimentoPct + '%)',
  [scontone.m1, scontone.m2, scontone.m3].every((m) => m >= scontone.pavimentoPct - 1));

/* ── Il pavimento morde davvero: ricarico sotto il minimo ────────────────── */
const sottoCosto = await misura({ _f_disc: 0, _f_mk1: 1.05, _f_mk2: 1.05, _f_mk3: 1.05 });
dico('FASE C · un ricarico ×1,05 darebbe il 5% di margine: il pavimento lo alza a '
  + sottoCosto.pavimentoPct + '% (margini ' + [sottoCosto.m1, sottoCosto.m2, sottoCosto.m3].join('% · ') + '%)',
  [sottoCosto.m1, sottoCosto.m2, sottoCosto.m3].every((m) => m >= sottoCosto.pavimentoPct - 1));
dico('FASE C2 · e la schermata lo dichiara invece di applicarlo in silenzio',
  sottoCosto.pav.every((x) => x === true));

/* ── La politica cambia il pavimento ─────────────────────────────────────── */
const luxury = await misura({ _f_pol: 'luxury', _f_mk1: 1.05, _f_mk2: 1.05, _f_mk3: 1.05 });
dico('FASE D · cambiando politica cambia il pavimento (standard '
  + sottoCosto.pavimentoPct + '% → ' + luxury.politica + ' ' + luxury.pavimentoPct + '%)',
  luxury.politica === 'luxury' && luxury.pavimentoPct > sottoCosto.pavimentoPct);
dico('FASE D2 · e il prezzo sale di conseguenza (€ ' + sottoCosto.p2 + ' → € ' + luxury.p2 + ')',
  luxury.p2 > sottoCosto.p2);
dico('FASE D3 · il select ricalcola da solo: prima non era collegato a niente',
  luxury.p2 !== sottoCosto.p2);

/* ── La tariffa oraria viene dai profili, non da un numero scritto a mano ── */
const tariffa = await page.evaluate(async () => {
  const el = document.getElementById('view-lasercalc');
  const campo = el && el.querySelector('#_f_labor');
  const daProfilo = window.InglyCostProfilesStore
    ? (window.InglyCostProfilesStore.ingressoSincrono({ ruolo: 'laser' }).laborPerHour || 0) : 0;
  return { campo: campo ? parseFloat(campo.value) : null, daProfilo };
});
dico('FASE E · la manodopera ha un valore e viene dai profili economici ('
  + tariffa.campo + ' €/h, profilo ' + tariffa.daProfilo + ' €/h)',
  tariffa.campo > 0 && tariffa.daProfilo > 0);

/* ── I materiali vengono dal magazzino vero ──────────────────────────────── */
const magazzino = await page.evaluate(async () => {
  /* Si scrive un articolo nel magazzino e si guarda se la tendina lo trova.
     Prima leggeva `ingly_saas_db.items` — il database delle licenze — e la
     risposta era sempre la stessa lista di esempi. */
  const nome = 'Prova magazzino ' + Date.now();
  await IDB.put('items', { id: 'qa-mat-' + Date.now(), name: nome, costPrice: 3.33,
    unit: 'pz', category: 'QA', quantity: 7 });
  await IDB.put('items', { id: 'qa-mach-' + Date.now(), name: 'Macchina che non è un materiale',
    type: 'machine', costPrice: 9000 });
  window.CalcMacchine._aggiornaMagazzino();
  await new Promise((s) => setTimeout(s, 1200));
  const lista = window.CalcMacchine.getMaterials();
  return {
    nome,
    quanti: lista.length,
    trovato: lista.some((m) => m.name === nome),
    prezzo: (lista.find((m) => m.name === nome) || {}).price,
    macchineDentro: lista.filter((m) => /Macchina che non è un materiale/.test(m.name)).length,
    esempiSoltanto: lista.every((m) => String(m.id).indexOf('m-') === 0),
  };
});
dico('FASE G · un articolo scritto in magazzino compare fra i materiali ('
  + magazzino.quanti + ' voci)', magazzino.trovato);
dico('FASE G2 · e con il suo prezzo, non con uno di esempio (€ ' + magazzino.prezzo + ')',
  Math.abs((magazzino.prezzo || 0) - 3.33) < 0.001);
dico('FASE G3 · le macchine restano fuori dalla tendina dei materiali ('
  + magazzino.macchineDentro + ')', magazzino.macchineDentro === 0);
dico('FASE G4 · la lista non è più quella di esempio', !magazzino.esempiSoltanto);

/* ── Le macchine tue vengono prima del listino ───────────────────────────── */
const parco = await page.evaluate(async () => {
  const id = 'qa-eq-' + Date.now();
  await IDB.put('equipment', { id, brand: 'INGLY', model: 'Macchina di prova',
    purchasePrice: 4000, usefulLifeHours: 2000, ratedPowerW: 500, maintenancePerHour: 0.30 });
  const idZoppa = 'qa-eq-zoppa-' + Date.now();
  await IDB.put('equipment', { id: idZoppa, brand: 'INGLY', model: 'Registrata a metà' });
  window.CalcMacchine._aggiornaParco();
  await new Promise((s) => setTimeout(s, 1200));
  const tutte = window.CalcMacchine.allMachines();
  const mia = tutte.find((m) => m.id === 'parco:' + id);
  const zoppa = tutte.find((m) => m.id === 'parco:' + idZoppa);
  return {
    quante: tutte.length,
    mieInTesta: (tutte[0] || {})._mia === true,
    trovata: !!mia,
    prezzo: mia && mia.price, ore: mia && mia.life_h, kw: mia && mia.kw,
    zoppaPresente: !!zoppa,
    zoppaDichiarata: !!(zoppa && zoppa._incompleta && /completare/.test(zoppa.model)),
    zoppaSenzaPrezzoFinto: !!(zoppa && zoppa.price === undefined),
  };
});
dico('FASE H · le macchine registrate entrano nell elenco (' + parco.quante + ' voci)',
  parco.trovata);
dico('FASE H2 · e stanno in testa, prima del listino commerciale', parco.mieInTesta);
dico('FASE H3 · con il prezzo pagato e le ore dichiarate (€ ' + parco.prezzo
  + ' · ' + parco.ore + ' h · ' + parco.kw + ' kW)',
  parco.prezzo === 4000 && parco.ore === 2000 && Math.abs(parco.kw - 0.5) < 0.001);
dico('FASE H4 · una macchina registrata a metà si vede lo stesso, marcata',
  parco.zoppaPresente && parco.zoppaDichiarata);
dico('FASE H5 · e non le viene messo addosso un prezzo di listino che non è suo',
  parco.zoppaSenzaPrezzoFinto);

/* ── Nessun numero rotto ─────────────────────────────────────────────────── */
dico('FASE F · nessun prezzo è NaN o infinito',
  [base, scontone, sottoCosto, luxury].every((r) => r
    && [r.p1, r.p2, r.p3, r.costo].every((v) => isFinite(v) && v >= 0)));

console.log('\nCALCOLATORE MACCHINE — IL PREZZO PASSA DAL MOTORE\n');
console.log('  costo unitario     € ' + base.costo);
console.log('  senza sconto       ' + [base.p1, base.p2, base.p3].map((p) => '€' + p).join(' · ')
  + '   margini ' + [base.m1, base.m2, base.m3].join('% · ') + '%');
console.log('  sconto 60% chiesto ' + [scontone.p1, scontone.p2, scontone.p3].map((p) => '€' + p).join(' · ')
  + '   ridotto al ' + scontone.disc + '%');
console.log('  ricarico ×1,05     ' + [sottoCosto.p1, sottoCosto.p2, sottoCosto.p3].map((p) => '€' + p).join(' · ')
  + '   pavimento ' + sottoCosto.pavimentoPct + '%\n');

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
console.log('\nun solo motore decide il prezzo ✔\n');
await browser.close();

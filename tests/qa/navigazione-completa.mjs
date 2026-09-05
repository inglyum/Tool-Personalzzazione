#!/usr/bin/env node
/**
 * navigazione-completa.mjs — la barra mostra l'applicazione, non la nasconde.
 *
 * Misurato sulla build prima della correzione: **35 voci visibili su 107**.
 * Settantadue moduli raggiungibili solo scrivendone il nome nella ricerca — e
 * per scriverlo bisogna sapere che esistono. Due cause sovrapposte:
 *
 *   1. la patch v37, al primo avvio, chiudeva tutti e nove i gruppi
 *      («Actually collapse ALL and let user expand», dice il suo commento) e
 *      salvava lo stato, così restava per sempre;
 *   2. dentro ogni gruppo, le voci non primarie stavano in un `<details>`
 *      chiuso, giustificato con «sono comunque raggiungibili dalla ricerca».
 *
 * Più un pulsante che nascondeva l'Accesso Rapido, in un menu che già
 * nascondeva i moduli.
 *
 * NAV-001 … NAV-014.
 *   node tests/qa/navigazione-completa.mjs [file]
 */
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const CARTELLA = process.env.NAV_SHOTS || '/tmp/nav-shots';
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
  /* Un utente che ha già la sidebar chiusa dalla patch v37: la migrazione deve
     riaprirgliela, altrimenti la correzione vale solo per le installazioni nuove. */
  localStorage.setItem('_v37sidebar_done', '1');
  localStorage.setItem('ingly_navgroups_v1', JSON.stringify({
    'ng-workspace': true, 'ng-production': true, 'ng-business': true, 'ng-lab': true,
    'ng-intelligence': true, 'ng-marketing': true, 'ng-finance': true, 'ng-system': true,
  }));
  /* E uno che aveva nascosto l'Accesso Rapido: deve ritrovarlo. */
  localStorage.setItem('prox_cn_hidden', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });
try { fs.mkdirSync(CARTELLA, { recursive: true }); } catch (e) {}
const scatta = (nome) => page.screenshot({ path: path.join(CARTELLA, nome), clip: { x: 0, y: 0, width: 340, height: 1000 } }).catch(() => {});

const stato = () => page.evaluate(() => {
  const voci = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')];
  const gruppi = [...document.querySelectorAll('#sidebar-nav .nav-group')];
  const nav = document.getElementById('sidebar-nav');
  const sezioni = voci.map((v) => v.dataset.section);
  const conta = {};
  sezioni.forEach((s) => { conta[s] = (conta[s] || 0) + 1; });
  return {
    gruppi: gruppi.length,
    gruppiChiusi: gruppi.filter((g) => g.className.includes('collapsed')).length,
    voci: voci.length,
    visibili: voci.filter((v) => v.offsetParent !== null).length,
    nascoste: voci.filter((v) => v.offsetParent === null).map((v) => v.dataset.section),
    duplicate: Object.keys(conta).filter((s) => conta[s] > 1),
    scrollH: nav ? nav.scrollHeight : 0,
    clientH: nav ? nav.clientHeight : 0,
    overflow: nav ? getComputedStyle(nav).overflowY : '',
  };
});

const cerca = (testo) => page.evaluate(async (t) => {
  const i = document.getElementById('nav-filter');
  if (!i) return { errore: 'campo di ricerca assente' };
  i.value = t;
  i.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 400));
  const vis = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')].filter((v) => v.offsetParent !== null);
  return { n: vis.length, sezioni: vis.map((v) => v.dataset.section) };
}, testo);

/* ── NAV-001 · tutti i gruppi aperti ────────────────────────────────────── */
const iniziale = await stato();
await scatta('1-avvio.png');
dico('NAV-001 · nessun gruppo chiuso all avvio (' + iniziale.gruppiChiusi + '/' + iniziale.gruppi + ')',
  iniziale.gruppiChiusi === 0);
dico('NAV-001b · la migrazione riapre chi aveva la sidebar chiusa dalla v37',
  iniziale.gruppiChiusi === 0);

/* ── NAV-002 · tutti i moduli visibili ──────────────────────────────────── */
dico('NAV-002 · tutte le voci sono visibili (' + iniziale.visibili + '/' + iniziale.voci + ')',
  iniziale.visibili === iniziale.voci && iniziale.voci > 90);
dico('NAV-002b · nessuna voce resta nascosta (' + iniziale.nascoste.slice(0, 5).join(', ') + ')',
  iniziale.nascoste.length === 0);

/* ── NAV-003 · ricerca vuota, niente nascosto ───────────────────────────── */
const vuota = await cerca('');
dico('NAV-003 · con la ricerca vuota nessun modulo è nascosto', vuota.n === iniziale.voci);

/* ── NAV-004…007 · il ciclo di ricerca del §7 ───────────────────────────── */
const gadget = await cerca('gadget');
await scatta('2-ricerca-gadget.png');
dico('NAV-004 · cercando «gadget» compare Gadget & Accessori',
  (gadget.sezioni || []).includes('gadgets'));

const dopoGadget = await cerca('');
await scatta('3-ricerca-cancellata.png');
dico('NAV-005 · cancellando torna tutto (' + dopoGadget.n + '/' + iniziale.voci + ')',
  dopoGadget.n === iniziale.voci);

const demand = await cerca('demand');
dico('NAV-006 · cercando «demand» compare la Mappa della domanda',
  (demand.sezioni || []).includes('demand_map'));

const dopoDemand = await cerca('');
dico('NAV-007 · cancellando torna di nuovo tutto (' + dopoDemand.n + ')', dopoDemand.n === iniziale.voci);

/* Anche i gruppi devono tornare aperti, non solo le voci. */
const dopoRicerche = await stato();
dico('NAV-007b · e i gruppi restano aperti dopo il ciclo di ricerca', dopoRicerche.gruppiChiusi === 0);

/* ── NAV-008/009 · espandi e comprimi ───────────────────────────────────── */
const comprimi = await page.evaluate(async () => {
  if (typeof NavGroups === 'undefined' || !NavGroups.collapseAll) return null;
  NavGroups.collapseAll();
  await new Promise((s) => setTimeout(s, 500));
  const g = [...document.querySelectorAll('#sidebar-nav .nav-group')];
  return { chiusi: g.filter((x) => x.className.includes('collapsed')).length, totali: g.length };
});
dico('NAV-009 · «Comprimi» comprime davvero tutti i gruppi',
  comprimi && comprimi.chiusi === comprimi.totali);

const espandi = await page.evaluate(async () => {
  if (typeof NavGroups === 'undefined' || !NavGroups.expandAll) return null;
  NavGroups.expandAll();
  await new Promise((s) => setTimeout(s, 500));
  const g = [...document.querySelectorAll('#sidebar-nav .nav-group')];
  const voci = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')];
  return { chiusi: g.filter((x) => x.className.includes('collapsed')).length, visibili: voci.filter((v) => v.offsetParent !== null).length };
});
dico('NAV-008 · «Espandi» apre davvero tutti i gruppi', espandi && espandi.chiusi === 0);
dico('NAV-008b · e rende di nuovo visibili tutte le voci', espandi && espandi.visibili === iniziale.voci);

/* ── §3 · il gruppo resta comprimibile a mano ───────────────────────────── */
const manuale = await page.evaluate(async () => {
  const t = document.querySelector('#sidebar-nav .nav-group .ng-header');
  if (!t) return null;
  const g = t.closest('.nav-group');
  t.click(); await new Promise((s) => setTimeout(s, 350));
  const chiuso = g.className.includes('collapsed');
  t.click(); await new Promise((s) => setTimeout(s, 350));
  return { chiuso, riaperto: !g.className.includes('collapsed') };
});
dico('§3 · un gruppo si comprime col clic sul titolo', manuale && manuale.chiuso);
dico('§3b · e si riapre col clic successivo', manuale && manuale.riaperto);

/* ── NAV-011/012 · l'Accesso Rapido non ha più il suo interruttore ──────── */
const rapido = await page.evaluate(() => ({
  pulsante: !!document.getElementById('prox-cn-showhide'),
  chiave: localStorage.getItem('prox_cn_hidden'),
  /* `textContent` legge anche il sorgente degli <script>: il commento che
     spiega perché il pulsante è stato tolto lo farebbe risultare presente.
     Qui interessa il testo che l'utente vede, cioè `innerText`. */
  testoNascondi: /Nascondi Accesso Rapido|Mostra Accesso Rapido/.test(document.body.innerText || ''),
  coreNav: !!document.getElementById('core-nav'),
  grigliaVisibile: (() => {
    const g = document.querySelector('#core-nav .cn-grid');
    return g ? getComputedStyle(g).display !== 'none' : null;
  })(),
  preventivoRapido: typeof window._ppmOpen === 'function',
}));
dico('NAV-011 · #prox-cn-showhide non esiste più', rapido.pulsante === false);
dico('NAV-011b · e i suoi testi non compaiono in pagina', rapido.testoNascondi === false);
dico('NAV-012 · la chiave prox_cn_hidden è stata ripulita', rapido.chiave === null);
dico('NAV-012b · chi l aveva nascosto ritrova l Accesso Rapido', rapido.grigliaVisibile !== false);
dico('§13 · il Preventivo rapido non è stato rotto', rapido.preventivoRapido === true);

/* ── NAV-013 · nessun duplicato ─────────────────────────────────────────── */
dico('NAV-013 · nessuna sezione compare due volte (' + iniziale.duplicate.join(', ') + ')',
  iniziale.duplicate.length === 0);

/* ── NAV-014 · i moduli che la direttiva elenca sono raggiungibili ──────── */
const richiesti = ['dashboard', 'clienti', 'quoter', 'laser_b2b', 'gestione_ordini', 'items',
  'settings', 'suppliers', 'lasercalc', 'print3d', 'apparel', 'catalog', 'product_builder',
  'ideas', 'bank_funds', 'gadgets', 'demand_map', 'marketintel', 'product_hunter', 'intel',
  'competitors', 'supplierintel', 'opportunity', 'finance', 'analytics', 'cloud_updater',
  'brand_identity', 'materials', 'components'];
const raggiungibili = await page.evaluate((lista) => {
  const presenti = new Set([...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')]
    .filter((v) => v.offsetParent !== null).map((v) => v.dataset.section));
  return lista.filter((s) => !presenti.has(s));
}, richiesti);
dico('NAV-014 · tutti i moduli elencati sono nella barra (' + raggiungibili.join(', ') + ')',
  raggiungibili.length === 0);

/* ── §12 · la barra scorre invece di nascondere ─────────────────────────── */
dico('§12 · la barra è più lunga dello schermo (' + iniziale.scrollH + ' px in ' + iniziale.clientH + ')',
  iniziale.scrollH > iniziale.clientH);
dico('§12b · e scorre invece di tagliare', iniziale.overflow === 'auto' || iniziale.overflow === 'scroll');
const fondo = await page.evaluate(async () => {
  const nav = document.getElementById('sidebar-nav');
  nav.scrollTop = nav.scrollHeight;
  await new Promise((s) => setTimeout(s, 400));
  return nav.scrollTop > 0;
});
dico('§12c · si arriva davvero in fondo', fondo);
await scatta('4-fondo-barra.png');

/* ── NAV-010 · dopo il ricaricamento lo stato regge ─────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await stato();
dico('NAV-010 · dopo il ricaricamento i gruppi restano aperti', dopoReload.gruppiChiusi === 0);
dico('NAV-010b · e le voci restano tutte visibili (' + dopoReload.visibili + ')',
  dopoReload.visibili === dopoReload.voci);
const rapidoDopo = await page.evaluate(() => ({
  pulsante: !!document.getElementById('prox-cn-showhide'),
  chiave: localStorage.getItem('prox_cn_hidden'),
}));
dico('NAV-010c · il pulsante non ricompare al ricaricamento', rapidoDopo.pulsante === false);
dico('NAV-010d · né la sua chiave', rapidoDopo.chiave === null);

/* ── §16 · una scelta dell'utente sopravvive ────────────────────────────── */
/* Si comprime un gruppo che NON contiene la sezione aperta: navigare verso una
   sezione apre il gruppo che la ospita (`NavGroups.expandFor`), e al
   ricaricamento l'applicazione ritorna sull'ultima sezione. Misurare la
   persistenza sul gruppo attivo misurerebbe quella riapertura, non la memoria
   della scelta. */
const scelta = await page.evaluate(async () => {
  const attivo = document.querySelector('#sidebar-nav .nav-item.active');
  const gruppoAttivo = attivo ? attivo.closest('.nav-group') : null;
  const g = [...document.querySelectorAll('#sidebar-nav .nav-group[data-group]')]
    .find((x) => x !== gruppoAttivo && x.querySelector('.ng-header'));
  if (!g) return null;
  const id = g.id;
  g.querySelector('.ng-header').click();
  await new Promise((s) => setTimeout(s, 400));
  return { id, chiuso: g.className.includes('collapsed'),
           memoria: localStorage.getItem('ingly_nav_groups_v1') };
});
dico('§4a · la scelta finisce in memoria (' + (scelta && scelta.memoria) + ')',
  !!scelta && scelta.chiuso === true && (scelta.memoria || '').includes(String(scelta.id).replace(/^ng-/, '')));
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const scettaDopo = await page.evaluate((id) => {
  const g = document.getElementById(id);
  return g ? g.className.includes('collapsed') : null;
}, scelta && scelta.id);
dico('§4 · un gruppo compresso a mano resta compresso dopo il ricaricamento', scettaDopo === true);

console.log('\nNAVIGAZIONE — LA BARRA MOSTRA L APPLICAZIONE\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
console.log('schermate in ' + CARTELLA);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nla barra mostra l applicazione ✔\n');
await browser.close();

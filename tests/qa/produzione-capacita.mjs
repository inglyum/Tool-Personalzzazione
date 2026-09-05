#!/usr/bin/env node
/**
 * produzione-capacita.mjs — PROD-001…010 nel browser vero.
 *
 * Prima: la vista Produzione elencava gli ordini con la data che qualcuno
 * aveva scritto a mano, e niente diceva se fosse raggiungibile. Nessun conto
 * della capacità, nessun conto del carico, nessuna stima di fine lavoro.
 *
 * Qui si verifica che i numeri compaiano quando i dati ci sono, e che al
 * loro posto compaia «stima incompleta» quando non ci sono.
 *
 *   node tests/qa/produzione-capacita.mjs [file]
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
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const preparato = await page.evaluate(async () => {
  await IDB.put('equipment', { id: 7701, name: 'Laser A', brand: 'INGLY', model: 'LA', tech: 'laser', hoursPerDay: 8 });
  await IDB.put('equipment', { id: 7702, name: 'Stampante B', brand: 'INGLY', model: 'SB', tech: 'print3d', expectedAnnualHours: 1250 });
  await IDB.put('equipment', { id: 7703, name: 'Fresa C', brand: 'INGLY', model: 'FC' });
  await IDB.put('equipment', { id: 7704, name: 'UV D', brand: 'INGLY', model: 'UD', tech: 'uv', hoursPerDay: 8 });

  const fra = (g) => { const d = new Date(); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };
  const ordini = [
    { id: 77001, name: 'Lavoro breve', clientName: 'Alfa', stage: 'produzione',
      machineId: '7701', machineName: 'INGLY LA', estimatedHours: 8, dueDate: fra(30), total: 300 },
    { id: 77002, name: 'Lavoro lungo', clientName: 'Beta', stage: 'produzione',
      machineId: '7701', machineName: 'INGLY LA', estimatedHours: 200, dueDate: fra(3), total: 900 },
    { id: 77003, name: 'Senza ore', clientName: 'Gamma', stage: 'accettato',
      machineId: '7702', machineName: 'INGLY SB', dueDate: fra(20), total: 150 },
    { id: 77004, name: 'Su macchina senza capacita', clientName: 'Delta', stage: 'produzione',
      machineId: '7703', machineName: 'INGLY FC', estimatedHours: 5, dueDate: fra(15), total: 200 },
    { id: 77005, name: 'Senza macchina', clientName: 'Epsilon', stage: 'produzione',
      estimatedHours: 4, dueDate: fra(10), total: 120 },
    /* Solo su questa macchina, quindi senza nessuno in coda davanti: è il
       caso in cui la data promessa è raggiungibile con margine. */
    { id: 77006, name: 'Lavoro comodo', clientName: 'Zeta', stage: 'produzione',
      machineId: '7704', machineName: 'INGLY UD', estimatedHours: 8, dueDate: fra(30), total: 250 },
  ];
  for (const o of ordini) await IDB.put('orders', o);
  App.navigate('gestione_ordini');
  await new Promise((s) => setTimeout(s, 1500));
  GestioneOrdini._setView('produzione');
  await new Promise((s) => setTimeout(s, 2000));
  return { motorePresente: typeof InglyProduzione !== 'undefined' };
});
dico('il motore di capacità è caricato', preparato.motorePresente);

/* ── PROD-001/002/003 · il pannello dice capacità, carico, residua ──────── */
const pannello = await page.evaluate(() => {
  const el = document.getElementById('go-content');
  const testo = el ? el.textContent : '';
  const barre = el ? el.querySelectorAll('#go-content div[style*="border-radius:99px"]').length : 0;
  return {
    presente: /Capacità/.test(testo),
    disponibile: /Disponibile/.test(testo),
    impegnate: /Impegnate/.test(testo),
    residue: /Residue/.test(testo),
    utilizzo: /Utilizzo/.test(testo),
    incompleta: /Stima incompleta/.test(testo),
    nonAssegnati: /non assegnati a nessuna macchina/.test(testo),
    barre,
    testo: testo.replace(/\s+/g, ' ').slice(0, 400),
  };
});
dico('PROD-001 · il pannello capacità esiste', pannello.presente);
dico('PROD-002 · mostra disponibile, impegnate, residue e utilizzo',
  pannello.disponibile && pannello.impegnate && pannello.residue && pannello.utilizzo);
dico('PROD-003 · una barra per macchina (' + pannello.barre + ')', pannello.barre >= 4);
dico('PROD-010 · dichiara che la stima è incompleta', pannello.incompleta);
dico('PROD-010b · e non nasconde gli ordini senza macchina', pannello.nonAssegnati);

/* ── I numeri sono quelli del motore, non altri ─────────────────────────── */
const numeri = await page.evaluate(async () => {
  const parco = await IDB.getAll('equipment');
  const ordini = await GestioneOrdini.getOrders();
  const a = InglyProduzione.analizza({ macchine: parco, ordini, timelogs: [], finestraGiorni: 30 });
  const laser = a.righe.filter((r) => String(r.id) === '7701')[0];
  const stampante = a.righe.filter((r) => String(r.id) === '7702')[0];
  const fresa = a.righe.filter((r) => String(r.id) === '7703')[0];
  return {
    laserCarico: laser && laser.carico,
    laserSovraccarico: laser && laser.sovraccarico,
    laserFonte: laser && laser.fonteCapacita,
    stampanteFonte: stampante && stampante.fonteCapacita,
    stampanteSenzaOre: stampante && stampante.ordiniSenzaOre,
    stampanteCarico: stampante && stampante.carico,
    fresaDisponibile: fresa && fresa.disponibile,
    fresaCompleto: fresa && fresa.completo,
    nonAssegnati: a.nonAssegnati.ordini,
    totaleIncognite: a.totali.incognite,
  };
});
dico('PROD-002b · il carico somma le ore degli ordini sulla macchina (' + numeri.laserCarico + ' h)', numeri.laserCarico === 208);
dico('PROD-004 · il sovraccarico è dichiarato', numeri.laserSovraccarico === true);
dico('PROD-001b · le ore al giorno dichiarate sono usate come dichiarate', numeri.laserFonte === 'dichiarata');
dico('PROD-001c · il monte ore annuo diventa una media dichiarata tale', numeri.stampanteFonte === 'derivata');
dico('PROD-010c · un ordine senza ore non conta zero (' + numeri.stampanteCarico + ' h, ' + numeri.stampanteSenzaOre + ' incognite)',
  numeri.stampanteCarico === 0 && numeri.stampanteSenzaOre === 1);
dico('PROD-010d · una macchina senza ore non ha capacità', numeri.fresaDisponibile === null && numeri.fresaCompleto === false);
dico('PROD-010e · gli ordini senza macchina restano nel conto', numeri.nonAssegnati === 1);

/* ── PROD-005/006 · scadenze e semaforo ─────────────────────────────────── */
const scadenze = await page.evaluate(() => {
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const cella = (nome) => {
    const r = righe.find((x) => x.textContent.includes(nome));
    const tds = r ? [...r.querySelectorAll('td')] : [];
    const td = tds[3];
    if (!td) return null;
    const pallino = td.querySelector('span[style*="color"]');
    return { testo: td.textContent.trim(), colore: pallino ? pallino.getAttribute('style') : '' };
  };
  return {
    breve: cella('Lavoro breve'),
    comodo: cella('Lavoro comodo'),
    lungo: cella('Lavoro lungo'),
    senzaOre: cella('Senza ore'),
    senzaCapacita: cella('Su macchina senza capacita'),
    intestazione: /Fine stimata/.test(document.getElementById('go-content').textContent),
  };
});
dico('PROD-005 · la colonna «Fine stimata» esiste', scadenze.intestazione);
dico('PROD-005b · un lavoro fattibile ha una data (' + (scadenze.breve && scadenze.breve.testo) + ')',
  /\d{2}\/\d{2}\/\d{4}/.test((scadenze.breve || {}).testo || ''));
dico('PROD-006 · un lavoro che non ci sta è rosso', /ef4444/.test((scadenze.lungo || {}).colore || ''));
dico('PROD-006b · un lavoro con margine è verde (' + (scadenze.comodo && scadenze.comodo.testo) + ')',
  /22c55e/.test((scadenze.comodo || {}).colore || ''));
/* «Lavoro breve» dura 8 ore ma ha davanti 200 ore sulla stessa macchina: è la
   coda a renderlo rosso, non il lavoro. È il conto che si voleva. */
dico('PROD-005c · la coda davanti sposta la data oltre la consegna promessa',
  /ef4444/.test((scadenze.breve || {}).colore || ''));
dico('PROD-010f · senza ore dichiarate la cella dice «stima incompleta»',
  /stima incompleta/.test((scadenze.senzaOre || {}).testo || ''));
dico('PROD-010g · e lo stesso senza capacità della macchina',
  /stima incompleta/.test((scadenze.senzaCapacita || {}).testo || ''));

/* ── PROD-009 · si dichiarano le ore, si salvano, si ricarica ───────────── */
const dichiarazione = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  await GestioneOrdini.openProductionPanel(77003);
  await a(700);
  const campo = document.getElementById('pp-hours');
  if (!campo) return { campo: false };
  campo.value = '6';
  const setup = document.getElementById('pp-setup');
  if (setup) setup.value = '30';
  await GestioneOrdini._savePanelChanges(77003);
  await a(900);
  const o = await IDB.get('orders', 77003);
  return { campo: true, ore: o && o.estimatedHours, setup: o && o.setupMinutes };
});
dico('PROD-009 · il pannello ha il campo delle ore di produzione', dichiarazione.campo === true);
dico('PROD-009b · le ore dichiarate finiscono nel record', dichiarazione.ore === 6 && dichiarazione.setup === 30);

await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const dopo = await page.evaluate(async () => {
  const o = await IDB.get('orders', 77003).catch(() => null);
  App.navigate('gestione_ordini');
  await new Promise((s) => setTimeout(s, 1500));
  GestioneOrdini._setView('produzione');
  await new Promise((s) => setTimeout(s, 2000));
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const r = righe.find((x) => x.textContent.includes('Senza ore'));
  const tds = r ? [...r.querySelectorAll('td')] : [];
  const parco = await IDB.getAll('equipment');
  const ordini = await GestioneOrdini.getOrders();
  const a = InglyProduzione.analizza({ macchine: parco, ordini, timelogs: [], finestraGiorni: 30 });
  const stampante = a.righe.filter((x) => String(x.id) === '7702')[0];
  return {
    ore: o && o.estimatedHours,
    cella: tds[3] ? tds[3].textContent.trim() : null,
    caricoStampante: stampante && stampante.carico,
    stampanteCompleta: stampante && stampante.completo,
  };
});
dico('PROD-009c · dopo il ricaricamento le ore ci sono ancora', dopo.ore === 6);
dico('PROD-009d · e ora la scadenza si stima (' + dopo.cella + ')', /\d{2}\/\d{2}\/\d{4}/.test(dopo.cella || ''));
dico('PROD-002c · il carico della macchina è cambiato di conseguenza (' + dopo.caricoStampante + ' h)', dopo.caricoStampante === 6);
dico('PROD-010h · e quella macchina non è più incompleta', dopo.stampanteCompleta === true);

console.log('\nPRODUZIONE — CAPACITÀ, CARICO, SCADENZE\n');
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
console.log('\nla produzione dice quanto può produrre ✔\n');
await browser.close();

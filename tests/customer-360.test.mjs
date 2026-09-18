/**
 * customer-360.test.mjs — CRM-15/17: storico economico e timeline, mai per nome.
 *
 * Il punto che questi test tengono fermo, sopra ogni altro: due clienti con
 * lo stesso nome non devono mai mescolare fatturato, margine o timeline —
 * è la stessa classe di difetto corretta in CRM-05b (ClientProfile), qui
 * applicata a un modulo nuovo prima che il difetto possa nascerci dentro.
 *
 * Il modulo non ricalcola economics: consuma InglyOrderEconomics,
 * InglyQuoteStatus e InglyCLV. Questi test lo verificano caricando i moduli
 * veri, non un doppio semplificato — un mock qui nasconderebbe esattamente
 * l'integrazione che deve essere provata.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console, Date };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
['order-economics.js', 'quote-status.js', 'clv.js', 'customer-360.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), sandbox);
});
const M = sandbox.window.InglyCustomer360;

const GIORNO = 86400000;
const OGGI = Date.parse('2026-06-01T00:00:00Z');
const giorniFa = (n) => new Date(OGGI - n * GIORNO).toISOString();

/* Due clienti con lo stesso nome, id diversi — il caso che CRM-05b ha chiuso
   per il profilo cliente, qui verificato per lo storico economico. */
const PADRE = 'c-padre';
const FIGLIO = 'c-figlio';

const ordinePadre = { id: 'o1', clientId: PADRE, clientName: 'Mario Rossi', total: 1000, economic: { revenueNet: 1000, costTotal: 400 }, created: giorniFa(10) };
const ordineFiglio = { id: 'o2', clientId: FIGLIO, clientName: 'Mario Rossi', total: 3000, economic: { revenueNet: 3000, costTotal: 500 }, created: giorniFa(5) };
const ordineSenzaCosto = { id: 'o3', clientId: PADRE, clientName: 'Mario Rossi', total: 200, economic: { revenueNet: 200 }, created: giorniFa(2) };
const ordineSenzaClientId = { id: 'o4', clientName: 'Mario Rossi', total: 9999, economic: { revenueNet: 9999, costTotal: 1 }, created: giorniFa(1) };

const ORDINI = [ordinePadre, ordineFiglio, ordineSenzaCosto, ordineSenzaClientId];

test('isolamento — mai per nome, sempre per clientId', async (t) => {
  await t.test('ordiniDiCliente non prende ordini di un cliente omonimo', () => {
    const suoi = M.ordiniDiCliente(PADRE, ORDINI);
    assert.equal(suoi.length, 2); // ordinePadre + ordineSenzaCosto
    assert.ok(suoi.every((o) => o.clientId === PADRE));
  });

  await t.test('un ordine senza clientId non appartiene a nessuno — non si ripiega sul nome', () => {
    const suoiPadre = M.ordiniDiCliente(PADRE, ORDINI);
    const suoiFiglio = M.ordiniDiCliente(FIGLIO, ORDINI);
    assert.ok(!suoiPadre.some((o) => o.id === 'o4'));
    assert.ok(!suoiFiglio.some((o) => o.id === 'o4'));
  });

  await t.test('le statistiche del padre non includono il fatturato del figlio', () => {
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi: [] });
    assert.equal(s.ordini.fatturatoNetto.valore, 1200); // 1000 + 200, non 3000 del figlio
  });

  await t.test('le statistiche del figlio non includono il fatturato del padre', () => {
    const s = M.statisticheCliente(FIGLIO, { ordini: ORDINI, preventivi: [] });
    assert.equal(s.ordini.fatturatoNetto.valore, 3000);
  });
});

test('CRM-15 — statistiche cliente, N/D quando manca il dato', async (t) => {
  await t.test('il costo totale è noto solo se almeno un ordine lo dichiara', () => {
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi: [] });
    // ordinePadre ha costo 400, ordineSenzaCosto non ce l'ha: 400 coperto da 1 su 2
    assert.equal(s.ordini.costoTotale.valore, 400);
    assert.equal(s.ordini.costoTotale.coperti, 1);
    assert.equal(s.ordini.costoTotale.totali, 2);
  });

  await t.test('un cliente senza ordini non mostra zero, mostra non noto con motivo', () => {
    const s = M.statisticheCliente('c-nessuno', { ordini: ORDINI, preventivi: [] });
    assert.equal(s.ordini.fatturatoNetto.noto, false);
    assert.match(s.ordini.fatturatoNetto.motivo, /nessun ordine/);
  });

  await t.test('il tasso di conversione è N/D senza preventivi', () => {
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi: [] });
    assert.equal(s.preventivi.tassoConversionePct.noto, false);
  });

  await t.test('il tasso di conversione si calcola sui preventivi decisi del solo cliente', () => {
    /* Nel vocabolario canonico (InglyQuoteStatus) "accettato" resta aperto:
       diventa parte della conversione solo quando è CONVERTED (confermato/
       ordinato) — un preventivo accettato ma senza ordine collegato non è
       ancora una vendita vinta. */
    const preventivi = [
      { id: 'q1', clientId: PADRE, status: 'confermato' },
      { id: 'q2', clientId: PADRE, status: 'rifiutato' },
      { id: 'q3', clientId: FIGLIO, status: 'confermato' }, // non deve contare per il padre
    ];
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi });
    assert.equal(s.preventivi.numero, 2);
    assert.equal(s.preventivi.tassoConversionePct.valore, 50);
  });

  await t.test('«preventivi accettati» conta anche chi è solo ACCEPTED, non ancora ordine', () => {
    const preventivi = [
      { id: 'q1', clientId: PADRE, status: 'accettato' },
      { id: 'q2', clientId: PADRE, status: 'confermato' },
      { id: 'q3', clientId: PADRE, status: 'rifiutato' },
    ];
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi });
    assert.equal(s.preventivi.accettatiOConvertiti, 2); // accettato + confermato
  });

  await t.test('primo e ultimo ordine vengono dalle date vere, non da un ordine di un altro cliente', () => {
    const s = M.statisticheCliente(PADRE, { ordini: ORDINI, preventivi: [] });
    assert.equal(new Date(s.ordini.primo).getTime(), Date.parse(giorniFa(10)));
    assert.equal(new Date(s.ordini.ultimo).getTime(), Date.parse(giorniFa(2)));
  });
});

test('CRM-15 — storico economico per periodo', async (t) => {
  await t.test('quattro periodi, sempre presenti', () => {
    /* Confronto per valore: l'array nasce nel contesto isolato del vm e ha
       un altro prototipo, che deepEqual conta come differenza (stesso
       accorgimento già usato in cost-engine.test.mjs). */
    const s = M.storicoEconomico(PADRE, ORDINI, { adesso: OGGI });
    assert.equal([...s.map((p) => p.id)].join(','), '30g,90g,anno,tutto');
  });

  await t.test('ultimi 30 giorni include entrambi gli ordini del padre (10gg e 2gg fa)', () => {
    const s = M.storicoEconomico(PADRE, ORDINI, { adesso: OGGI });
    const p30 = s.find((x) => x.id === '30g');
    assert.equal(p30.ordini, 2);
    assert.equal(p30.ricavi, 1200);
  });

  await t.test('il ticket medio si calcola solo sui ricavi noti', () => {
    const s = M.storicoEconomico(PADRE, ORDINI, { adesso: OGGI });
    const tutto = s.find((x) => x.id === 'tutto');
    assert.equal(tutto.ticketMedio, 600); // (1000+200)/2
  });

  await t.test('un periodo senza ordini del cliente ha ordini:0 e ricavi null, non zero', () => {
    const s = M.storicoEconomico('c-nessuno', ORDINI, { adesso: OGGI });
    const tutto = s.find((x) => x.id === 'tutto');
    assert.equal(tutto.ordini, 0);
    assert.equal(tutto.ricavi, null);
  });

  await t.test('coperturaCompleta è falsa quando un ordine del periodo non ha ricavo noto', () => {
    // ordineSenzaCosto ha ricavo (200) ma non costo — coperturaCompleta guarda i ricavi
    const s = M.storicoEconomico(PADRE, ORDINI, { adesso: OGGI });
    const tutto = s.find((x) => x.id === 'tutto');
    assert.equal(tutto.coperturaCompleta, true); // entrambi gli ordini del padre HANNO ricavo noto
  });
});

test('CRM-15 — CLV senza duplicare la formula', async (t) => {
  await t.test('restituisce la riga vera calcolata da InglyCLV, non una copia', () => {
    const r = M.clvCliente(PADRE, ORDINI, [{ id: PADRE, name: 'Mario Rossi (padre)' }], { adesso: OGGI });
    assert.equal(r.disponibile, true);
    assert.equal(r.riga.id, PADRE);
    assert.equal(r.riga.storico.ricavo, 1200);
  });

  await t.test('un cliente senza ordini e senza anagrafica non ha CLV, con motivo', () => {
    const r = M.clvCliente('c-fantasma', ORDINI, [], { adesso: OGGI });
    assert.equal(r.disponibile, false);
    assert.match(r.motivo, /nessun dato CLV/);
  });
});

test('CRM-17 — timeline unificata', async (t) => {
  const cliente = { id: PADRE, name: 'Mario Rossi', createdAt: giorniFa(20) };
  const preventivi = [{ id: 'q1', clientId: PADRE, date: giorniFa(11), product: 'Targa laser', status: 'confermato' }];
  const ordiniPadre = [ordinePadre, ordineSenzaCosto];

  await t.test('include la creazione del cliente', () => {
    const tl = M.timelineCliente(PADRE, { cliente, preventivi, ordini: ordiniPadre });
    assert.ok(tl.some((e) => e.tipo === 'CLIENTE_CREATO'));
  });

  await t.test('include preventivi e ordini del solo cliente richiesto', () => {
    const tl = M.timelineCliente(PADRE, { cliente, preventivi, ordini: ORDINI });
    const idOrdini = tl.filter((e) => e.tipo === 'ORDINE_CREATO').map((e) => e.rif.id);
    assert.ok(idOrdini.includes('o1') && idOrdini.includes('o3'));
    assert.ok(!idOrdini.includes('o2'), 'l\'ordine del figlio non deve comparire nella timeline del padre');
  });

  await t.test('è ordinata dal più recente al più vecchio', () => {
    const tl = M.timelineCliente(PADRE, { cliente, preventivi, ordini: ordiniPadre });
    for (let i = 1; i < tl.length; i++) assert.ok(Date.parse(tl[i - 1].data) >= Date.parse(tl[i].data));
  });

  await t.test('un preventivo convertito in ordine porta il legame, non un evento duplicato inventato', () => {
    const q = { id: 'q9', clientId: PADRE, date: giorniFa(15) };
    const o = { id: 'o9', clientId: PADRE, created: giorniFa(14), quoteId: 'q9' };
    const tl = M.timelineCliente(PADRE, { cliente, preventivi: [q], ordini: [o] });
    const evOrdine = tl.find((e) => e.tipo === 'ORDINE_CREATO');
    assert.equal(evOrdine.rif.daPreventivo, 'q9');
  });

  await t.test('nessun evento nasce senza una data reale nel record', () => {
    const preventivoSenzaData = { id: 'q0', clientId: PADRE };
    const tl = M.timelineCliente(PADRE, { cliente: null, preventivi: [preventivoSenzaData], ordini: [] });
    assert.equal(tl.length, 0);
  });
});

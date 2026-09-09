/**
 * quote-to-order.test.mjs — la pipeline preventivo → ordine.
 *
 * I casi che contano non sono quelli che riescono: sono quelli che falliscono
 * a metà. Prima di questo modulo il flusso faceva
 *
 *     await this.saveQuote().catch(()=>{});
 *
 * e proseguiva. Un preventivo non salvato produceva un ordine senza
 * `quoteId`, senza `clientId`, con un totale calcolato da una formula sua.
 *
 * Qui si simula ogni passo che può rompersi e si guarda che cosa resta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/quote-to-order.js', 'utf8'), sandbox);
const P = sandbox.window.InglyQuoteToOrder;

/* ── Un archivio finto, con i guasti che servono ─────────────────────────── */
function archivio(opzioni = {}) {
  const dati = { quotes: new Map(), orders: new Map() };
  return {
    dati,
    scritture: [],
    async put(store, rec) {
      this.scritture.push(store);
      if (opzioni.putRompe === store) throw new Error('quota esaurita');
      dati[store].set(String(rec.id), JSON.parse(JSON.stringify(rec)));
      /* «Scritto ma non rileggibile»: il caso che un `put` senza eccezioni non
         esclude, e che nessun controllo vedeva prima. */
      if (opzioni.putSparisce === store) dati[store].delete(String(rec.id));
      return rec.id;
    },
    async get(store, id) {
      if (opzioni.getRompe === store) throw new Error('archivio non raggiungibile');
      return dati[store].get(String(id)) || null;
    },
    async getAll(store) { return [...dati[store].values()]; },
  };
}

const QUOTE_VALIDO = {
  id: 101, name: 'Targa Ortigia', clientId: 7, clientName: 'Bar Duomo',
  lines: [{ name: 'Targa', subtotal: 40 }],
  totalCost: 18.15, netPrice: 30.25, grossPrice: 36.91,
  deadline: '2026-10-01', notes: 'consegna a mano', discount: 0, ivaMode: true,
  economicSnapshot: { engineVersion: '1.2.0', costo: 18.15 },
};

/* Un preventivatore finto: salva davvero nell'archivio, come quello vero. */
function quoter(arch, opzioni = {}) {
  return {
    lines: opzioni.senzaRighe ? [] : QUOTE_VALIDO.lines,
    salvataggi: 0,
    async saveQuote() {
      this.salvataggi++;
      if (opzioni.salvaSolleva) throw new Error('disco pieno');
      if (opzioni.salvaFallisce) return { ok: false, motivo: 'Inserisci il titolo del lavoro' };
      const q = Object.assign({}, QUOTE_VALIDO, opzioni.quote || {});
      await arch.put('quotes', q);
      if (opzioni.salvaNonVerificabile) arch.dati.quotes.delete(String(q.id));
      return { ok: true, id: q.id, quote: q };
    },
  };
}

function gestione(arch, opzioni = {}) {
  return {
    chiamate: 0,
    async _saveOrderFromQuoter(d) {
      this.chiamate++;
      if (opzioni.creaSolleva) throw new Error('workflow non disponibile');
      if (opzioni.creaFallisce) return { ok: false, motivo: 'Ordine non salvato' };
      if (opzioni.ritornaOrdineNudo) {
        const o = Object.assign({ id: 900, stage: 'inviato', status: 'inviato' }, d);
        await arch.put('orders', o);
        return o;
      }
      const o = Object.assign({ id: 900, stage: 'inviato', status: 'inviato' }, d);
      await arch.put('orders', o);
      if (opzioni.ordineNonVerificabile) arch.dati.orders.delete(String(o.id));
      return { ok: true, id: o.id, order: o };
    },
  };
}

const porte = (arch, gest, extra = {}) => Object.assign({
  archivio: arch, gestione: gest,
  naviga() {}, avvisa() {}, registra() {},
  evento(nome, det) { (extra._eventi = extra._eventi || []).push({ nome, det }); },
}, extra);

/* ── Il caso che funziona ───────────────────────────────────────────────── */

test('il giro completo crea l\'ordine e lo collega al preventivo', async () => {
  const a = archivio(); const g = gestione(a);
  const eventi = [];
  const r = await P.invia(quoter(a), porte(a, g, { evento: (n, d) => eventi.push({ n, d }) }));

  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.passo, 'completato');
  assert.equal(r.quoteId, 101);
  assert.equal(r.orderId, 900);

  const ordine = await a.get('orders', 900);
  assert.equal(ordine.quoteId, 101, 'l\'ordine deve sapere da quale preventivo viene');
  assert.equal(ordine.clientId, 7, 'il nome del cliente è informativo, l\'identità è l\'id');
  assert.equal(ordine.clientName, 'Bar Duomo');

  const quote = await a.get('quotes', 101);
  assert.equal(quote.orderId, 900, 'e il preventivo deve sapere qual è il suo ordine');
  assert.equal(eventi.length, 1, 'un evento solo, e dopo la verifica');
  assert.equal(eventi[0].n, 'orderUpdated');
});

test('il totale dell\'ordine viene dal preventivo, non da una formula locale', async () => {
  const a = archivio(); const g = gestione(a);
  await P.invia(quoter(a), porte(a, g));
  const o = await a.get('orders', 900);
  /* Il flusso vecchio faceva `subtotal × (1 + markup)`: su queste righe
     avrebbe dato 80, non 30,25. */
  assert.equal(o.total, 30.25);
  assert.equal(o.totalNet, 30.25);
  assert.equal(o.totalGross, 36.91);
  assert.equal(o.totalCost, 18.15);
});

test('lo storico economico si porta con sé, non si ricostruisce', async () => {
  const a = archivio(); const g = gestione(a);
  await P.invia(quoter(a), porte(a, g));
  const o = await a.get('orders', 900);
  assert.equal(o.economicSnapshot.engineVersion, '1.2.0');
  assert.equal(o.economicSnapshot.costo, 18.15);
});

/* ── I casi che falliscono, che sono quelli che contano ─────────────────── */

test('preventivo senza righe: non si salva niente e non nasce nessun ordine', async () => {
  const a = archivio(); const g = gestione(a);
  const q = quoter(a, { senzaRighe: true });
  const r = await P.invia(q, porte(a, g));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'valida');
  assert.equal(q.salvataggi, 0, 'non si scrive niente prima di aver validato');
  assert.equal(g.chiamate, 0);
});

test('salvataggio fallito: nessun ordine, e il motivo è quello vero', async () => {
  const a = archivio(); const g = gestione(a);
  const r = await P.invia(quoter(a, { salvaFallisce: true }), porte(a, g));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'salva');
  assert.match(r.motivo, /titolo/);
  assert.equal(g.chiamate, 0, 'è esattamente il caso che il vecchio catch(()=>{}) lasciava passare');
});

test('salvataggio che solleva: l\'eccezione non si inghiotte', async () => {
  const a = archivio(); const g = gestione(a);
  const r = await P.invia(quoter(a, { salvaSolleva: true }), porte(a, g));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'salva');
  assert.match(r.motivo, /disco pieno/);
  assert.equal(g.chiamate, 0);
});

test('preventivo scritto ma non rileggibile: non si prosegue', async () => {
  const a = archivio(); const g = gestione(a);
  const r = await P.invia(quoter(a, { salvaNonVerificabile: true }), porte(a, g));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'verificaQuote');
  assert.equal(g.chiamate, 0);
});

test('preventivo salvato ma ordine fallito: il preventivo resta, e lo si dice', async () => {
  const a = archivio(); const g = gestione(a, { creaFallisce: true });
  const r = await P.invia(quoter(a), porte(a, g));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'creaOrdine');
  assert.equal(r.quoteSalvato, true);
  assert.ok(await a.get('quotes', 101), 'buttare via il preventivo sarebbe peggio');
  const m = P.messaggio(r);
  assert.match(m.testo, /Preventivo salvato, ma creazione ordine non riuscita/);
});

test('ordine scritto ma non rileggibile: non si dichiara completato', async () => {
  const a = archivio(); const g = gestione(a, { ordineNonVerificabile: true });
  const eventi = [];
  const r = await P.invia(quoter(a), porte(a, g, { evento: (n, d) => eventi.push(n) }));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'verificaOrdine');
  assert.equal(eventi.length, 0, 'nessun evento su un ordine che non si rilegge');
});

test('workflow assente: non si perde il preventivo', async () => {
  const a = archivio();
  const r = await P.invia(quoter(a), porte(a, null));
  assert.equal(r.ok, false);
  assert.equal(r.passo, 'creaOrdine');
  assert.ok(await a.get('quotes', 101));
});

/* ── Il doppio clic ─────────────────────────────────────────────────────── */

test('due invii dello stesso preventivo non fanno due ordini', async () => {
  const a = archivio(); const g = gestione(a);
  const q = quoter(a);
  const primo = await P.invia(q, porte(a, g));
  assert.equal(primo.ok, true);

  const secondo = await P.invia(q, porte(a, g));
  assert.equal(secondo.ok, false);
  assert.equal(secondo.passo, 'giaInviato');
  assert.equal(secondo.duplicatoEvitato, true);
  assert.equal(secondo.orderId, 900, 'e dice quale ordine aprire');
  assert.equal(g.chiamate, 1, 'l\'ordine si crea una volta sola');
  assert.equal((await a.getAll('orders')).length, 1);
});

test('il quoteId si confronta come stringa: numero e stringa sono lo stesso preventivo', async () => {
  const a = archivio(); const g = gestione(a);
  await a.put('orders', { id: 5, quoteId: '101', name: 'esistente', total: 1, stage: 'inviato', status: 'inviato' });
  const r = await P.invia(quoter(a), porte(a, g));
  assert.equal(r.duplicatoEvitato, true, '101 e «101» sono lo stesso preventivo');
  assert.equal(g.chiamate, 0);
});

test('dopo un ordine fallito si può riprovare senza duplicare il preventivo', async () => {
  const a = archivio();
  const q = quoter(a);
  const primo = await P.invia(q, porte(a, gestione(a, { creaFallisce: true })));
  assert.equal(primo.ok, false);

  const secondo = await P.invia(q, porte(a, gestione(a)));
  assert.equal(secondo.ok, true, 'il riprova deve funzionare');
  assert.equal((await a.getAll('quotes')).length, 1, 'e non deve nascere un secondo preventivo');
  assert.equal((await a.getAll('orders')).length, 1);
});

/* ── Compatibilità e decoratori ─────────────────────────────────────────── */

test('un adattatore vecchio che restituisce l\'ordine nudo funziona ancora', async () => {
  const a = archivio(); const g = gestione(a, { ritornaOrdineNudo: true });
  const r = await P.invia(quoter(a), porte(a, g));
  assert.equal(r.ok, true);
  assert.equal(r.orderId, 900);
});

test('un decoratore aggiunge campi senza sostituire il metodo', async () => {
  P._svuotaDecoratori();
  P.aggiungiDecoratore((dati, quote) => ({ tecnologia: 'laser', daQuote: quote.name }));
  const a = archivio(); const g = gestione(a);
  await P.invia(quoter(a), porte(a, g));
  const o = await a.get('orders', 900);
  assert.equal(o.tecnologia, 'laser');
  assert.equal(o.daQuote, 'Targa Ortigia');
  P._svuotaDecoratori();
});

test('un decoratore che solleva non impedisce l\'ordine', async () => {
  P._svuotaDecoratori();
  P.aggiungiDecoratore(() => { throw new Error('add-on rotto'); });
  const a = archivio(); const g = gestione(a);
  const r = await P.invia(quoter(a), porte(a, g));
  assert.equal(r.ok, true, 'un accessorio non può impedire un ordine');
  P._svuotaDecoratori();
});

/* ── La verifica, da sola ───────────────────────────────────────────────── */

test('verifica: un record con un campo mancante non passa', async () => {
  const a = archivio();
  await a.put('orders', { id: 1, quoteId: 2, name: 'x', total: 5, stage: 'inviato' });
  const v = await P.verifica(a, 'orders', 1, P.CAMPI_ORDINE);
  assert.equal(v.ok, false);
  assert.match(v.motivo, /status/);
});

test('verifica: un array vuoto è una scelta, non un buco', () => {
  assert.equal(P.mancanti({ id: 1, lines: [] }, ['id', 'lines']).length, 0);
  assert.deepEqual(P.mancanti({ id: 1 }, ['id', 'lines']), ['lines']);
});

test('verifica: archivio che solleva non passa per riuscito', async () => {
  const a = archivio({ getRompe: 'orders' });
  const v = await P.verifica(a, 'orders', 1, P.CAMPI_ORDINE);
  assert.equal(v.ok, false);
});

test('i messaggi dicono cosa fare, non «errore generico»', () => {
  assert.match(P.messaggio({ ok: true, orderId: 12 }).testo, /Ordine #12 creato/);
  assert.match(P.messaggio({ ok: false, duplicatoEvitato: true }).testo, /già stato inviato/);
  assert.equal(P.messaggio(null).tipo, 'error');
});

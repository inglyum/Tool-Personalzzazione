/* Il listino è dati, non condizioni sparse. Questi test esistono perché il
   giorno in cui una funzione cambia piano, il cambiamento deve avvenire in un
   posto solo — e questi test dicono subito se ne è rimasto un altro. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['plan-catalog.js', 'subscription.js', 'entitlements.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
});
const P = ctx.InglyPiani;
const S = ctx.InglyAbbonamento;
const E = ctx.InglyEntitlements;

/* ── Catalogo ───────────────────────────────────────────────────────────── */

test('i tre piani esistono, in ordine di livello', () => {
  assert.equal(P.elenco().map((p) => p.id).join('|'), 'standard|premium|business');
  assert.equal(P.elenco().map((p) => p.livello).join('|'), '1|2|3');
});

test('i prezzi sono quelli del listino, mensile e annuale', () => {
  assert.equal(P.prezzo('standard', 'monthly').amount, 19);
  assert.equal(P.prezzo('standard', 'yearly').amount, 190);
  assert.equal(P.prezzo('premium', 'monthly').amount, 39);
  assert.equal(P.prezzo('premium', 'yearly').amount, 390);
  assert.equal(P.prezzo('business', 'monthly').amount, 79);
  assert.equal(P.prezzo('business', 'yearly').amount, 790);
});

test('ogni prezzo ha id, valuta e validità', () => {
  const p = P.prezzo('premium', 'yearly');
  assert.equal(p.id, 'premium_y');
  assert.equal(p.currency, 'EUR');
  assert.equal(p.plan_id, 'premium');
  assert.equal(p.billing_interval, 'yearly');
  assert.ok(p.effective_from);
});

test('«due mesi in regalo» si calcola dai prezzi veri, non si dichiara', () => {
  ['standard', 'premium', 'business'].forEach((id) => {
    const r = P.risparmioAnnuale(id);
    assert.equal(r.mesiRegalati, 2, id + ': ' + r.mesiRegalati);
    assert.equal(r.risparmio, P.prezzo(id, 'monthly').amount * 2);
  });
});

test('un piano contiene le funzioni dei piani sotto', () => {
  const std = P.piano('standard').funzioni;
  const prem = P.piano('premium').funzioni;
  const biz = P.piano('business').funzioni;
  std.forEach((f) => assert.ok(prem.includes(f), 'premium non ha ' + f));
  prem.forEach((f) => assert.ok(biz.includes(f), 'business non ha ' + f));
});

test('la produzione è Premium, le API sono Business', () => {
  assert.equal(P.include('standard', 'production'), false);
  assert.equal(P.include('premium', 'production'), true);
  assert.equal(P.include('premium', 'api'), false);
  assert.equal(P.include('business', 'api'), true);
});

test('una funzione che il catalogo non conosce non si concede', () => {
  assert.equal(P.include('business', 'funzione_inventata'), false);
  assert.equal(P.pianoMinimoPer('funzione_inventata'), null);
});

test('i limiti: 100, 500, senza limite', () => {
  assert.equal(P.limite('standard', 'orders_month'), 100);
  assert.equal(P.limite('premium', 'orders_month'), 500);
  assert.equal(P.limite('business', 'orders_month'), null, 'null, non Infinity');
  assert.equal(P.limite('standard', 'users'), 1);
  assert.equal(P.limite('premium', 'users'), 3);
});

test('il catalogo non si modifica da fuori', () => {
  const p = P.piano('standard');
  p.funzioni.push('production');
  p.limiti.orders_month = 99999;
  assert.equal(P.include('standard', 'production'), false, 'un piano mutato è un diritto regalato');
  assert.equal(P.limite('standard', 'orders_month'), 100);
});

test('il confronto ha una riga per funzione, con i tre piani', () => {
  const c = P.confronto();
  assert.equal(c.length, P.FUNZIONI.length);
  const prod = c.find((r) => r.id === 'production');
  assert.equal(prod.standard, false);
  assert.equal(prod.premium, true);
  assert.equal(prod.business, true);
});

/* ── Abbonamento ────────────────────────────────────────────────────────── */

const g = (n) => Date.parse('2026-09-01T00:00:00.000Z') + n * 86400000;

test('la prova dura quattordici giorni sul piano di prova', () => {
  const t = S.creaTrial({ adesso: g(0) });
  assert.equal(t.status, 'trial');
  assert.equal(t.plan_id, P.PIANO_TRIAL);
  assert.equal(Math.round((Date.parse(t.trial_end) - g(0)) / 86400000), P.GIORNI_TRIAL);
});

test('giorno 0, 13, 14, 15 della prova', () => {
  const t = S.creaTrial({ adesso: g(0) });
  assert.equal(S.stato(t, g(0)).stato, 'trial');
  assert.equal(S.stato(t, g(0)).accesso, true);
  assert.equal(S.stato(t, g(13)).stato, 'trial');
  assert.equal(S.stato(t, g(13)).inScadenza, true, 'il giorno 13 avvisa');
  assert.equal(S.stato(t, g(14)).stato, 'expired');
  assert.equal(S.stato(t, g(14)).accesso, false);
  assert.equal(S.stato(t, g(15)).stato, 'expired');
});

test('nessun abbonamento significa scaduto, non attivo', () => {
  assert.equal(S.stato(null).stato, 'expired');
  assert.equal(S.stato(null).accesso, false);
});

test('uno stato non riconosciuto non apre: chiude', () => {
  const s = S.stato({ status: 'qualcosa', plan_id: 'business' });
  assert.equal(s.accesso, false);
  assert.match(s.motivo, /non riconosciuto/);
});

test('disdire non toglie l\'accesso: lo fa finire alla scadenza', () => {
  const a = S.creaAttivo('premium', 'monthly', { adesso: g(0) });
  const d = S.disdici(a, { adesso: g(5) }).abbonamento;
  assert.equal(S.stato(d, g(10)).stato, 'cancelled');
  assert.equal(S.stato(d, g(10)).accesso, true, 'il periodo è pagato');
  assert.equal(S.stato(d, g(40)).stato, 'expired');
});

test('una prova disdetta finisce quando finiva la prova, non un mese dopo', () => {
  const t = S.creaTrial({ adesso: g(0) });
  const d = S.disdici(t, { adesso: g(3) }).abbonamento;
  assert.equal(S.stato(d, g(10)).accesso, true);
  assert.equal(S.stato(d, g(20)).stato, 'expired');
});

test('un pagamento fallito dà tolleranza, poi scade', () => {
  const a = S.creaAttivo('premium', 'monthly', { adesso: g(0) });
  const pd = S.segnaNonPagato(a, { adesso: g(30) }).abbonamento;
  assert.equal(S.stato(pd, g(32)).stato, 'past_due');
  assert.equal(S.stato(pd, g(32)).accesso, true);
  assert.equal(S.stato(pd, g(32)).inScadenza, true);
  assert.equal(S.stato(pd, g(40)).stato, 'expired');
});

test('sospeso non scade e non dà accesso', () => {
  const a = S.creaAttivo('business', 'yearly', { adesso: g(0) });
  const s = S.sospendi(a, { adesso: g(1), motivo: 'verifica' }).abbonamento;
  assert.equal(S.stato(s, g(2)).accesso, false);
  assert.equal(S.stato(s, g(9999)).stato, 'suspended', 'non decade da solo');
});

test('un periodo finito senza rinnovo non si presume pagato', () => {
  const a = S.creaAttivo('premium', 'monthly', { adesso: g(0) });
  assert.equal(S.stato(a, g(40)).stato, 'expired');
  const r = S.rinnova(a, { adesso: g(30) }).abbonamento;
  assert.equal(S.stato(r, g(40)).stato, 'active');
});

test('attivare un piano che non esiste fallisce', () => {
  const t = S.creaTrial({ adesso: g(0) });
  const e = S.attiva(t, 'gold', 'monthly');
  assert.equal(e.ok, false);
  assert.match(e.motivo, /piano sconosciuto/);
});

test('attivare dalla prova collega il prezzo canonico', () => {
  const t = S.creaTrial({ adesso: g(0) });
  const a = S.attiva(t, 'premium', 'yearly', { adesso: g(5) });
  assert.equal(a.ok, true);
  assert.equal(a.abbonamento.price_id, 'premium_y');
  assert.equal(a.abbonamento.billing_interval, 'yearly');
});

/* ── Entitlement ────────────────────────────────────────────────────────── */

const conPiano = (id, uso) => ({ abbonamento: S.creaAttivo(id, 'monthly'), utilizzo: uso || {} });

test('standard non ha la produzione, premium sì', () => {
  assert.equal(E.can('production', conPiano('standard')).ok, false);
  assert.equal(E.can('production', conPiano('premium')).ok, true);
});

test('il messaggio di blocco dice quale piano serve', () => {
  const e = E.can('production', conPiano('standard'));
  assert.match(e.motivo, /Premium/);
  assert.equal(e.pianoRichiesto.id, 'premium');
});

test('un abbonamento scaduto toglie le funzioni ma lascia i dati raggiungibili', () => {
  const scaduto = { abbonamento: S.creaTrial({ adesso: g(-100) }) };
  assert.equal(E.can('crm', scaduto).ok, false);
  assert.equal(E.can('dashboard', scaduto).ok, true, 'senza dashboard non si può nemmeno riabbonarsi');
  assert.equal(E.can('backup', scaduto).ok, true, 'e i propri dati restano esportabili');
});

test('senza abbonamento non si concede niente oltre il minimo', () => {
  assert.equal(E.can('crm', { abbonamento: null }).ok, false);
  assert.equal(E.can('production', { abbonamento: null }).ok, false);
});

test('una funzione non dichiarata nel catalogo non passa', () => {
  assert.equal(E.can('funzione_inventata', conPiano('business')).ok, false);
});

test('i limiti: sotto, al limite, oltre', () => {
  assert.equal(E.limit('orders_month', conPiano('standard', { orders_month: 99 })).entro, true);
  assert.equal(E.limit('orders_month', conPiano('standard', { orders_month: 100 })).entro, false,
    '100 su 100 vuol dire che il 101° non passa');
  assert.equal(E.limit('orders_month', conPiano('standard', { orders_month: 150 })).rimanente, 0);
});

test('business è senza limite, e lo dichiara', () => {
  const l = E.limit('orders_month', conPiano('business', { orders_month: 99999 }));
  assert.equal(l.illimitato, true);
  assert.equal(l.limite, null);
  assert.equal(l.entro, true);
});

test('un abbonamento scaduto azzera i limiti', () => {
  const l = E.limit('orders_month', { abbonamento: S.creaTrial({ adesso: g(-100) }) });
  assert.equal(l.entro, false);
  assert.equal(l.limite, 0);
});

test('require segnala il blocco a chi deve fermarsi', () => {
  const e = E.require('production', conPiano('standard'));
  assert.equal(e.ok, false);
  assert.equal(e.bloccato, true);
});

test('il contesto si può impostare una volta e riusare', () => {
  E.usaContesto(conPiano('premium', { orders_month: 10 }));
  assert.equal(E.can('production').ok, true);
  assert.equal(E.limit('orders_month').rimanente, 490);
  assert.equal(E.getPlan().id, 'premium');
  E.usaContesto(null);
  assert.equal(E.can('production').ok, false, 'senza contesto non si concede');
});

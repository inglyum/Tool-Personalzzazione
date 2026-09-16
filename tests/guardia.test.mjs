/* La guardia decide, e la decisione si misura senza DOM. Quello che questi
   test difendono non è il caso normale: è la fila di modi in cui una guardia
   può dire di sì per distrazione. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const MODULI = ['plan-catalog.js', 'subscription.js', 'auth-identity.js',
  'device-sessions.js', 'account-service.js', 'auth-guard.js'];

function carica(archivioIniziale) {
  const store = new Map();
  if (archivioIniziale !== undefined) store.set('ingly_saas_db', archivioIniziale);
  const ctx = {
    console, crypto: globalThis.crypto, TextEncoder, Buffer,
    navigator: { userAgent: 'Chrome/130.0 Windows NT 10.0', platform: 'Win32' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of MODULI) {
    vm.runInContext(fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
  }
  return {
    ctx, G: ctx.InglyGuardia, C: ctx.InglyAccount, D: ctx.InglyDispositivi,
    A: ctx.InglyAbbonamento, store,
    db: () => JSON.parse(store.get('ingly_saas_db') || '{}'),
    scrivi: (d) => store.set('ingly_saas_db', JSON.stringify(d)),
  };
}

const DATI = {
  nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
  password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
};

async function conAccount(opzioni) {
  const h = carica('{}');
  const r = await h.C.crea(DATI, opzioni || {});
  assert.equal(r.ok, true, r.motivo);
  return Object.assign(h, { r, sessione: r.sessione, utente: r.utente });
}

/* ── Il caso normale ────────────────────────────────────────────────────── */

test('un account appena creato entra', async () => {
  const { G, sessione } = await conAccount();
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'entra', e.messaggio);
  assert.equal(e.causa, null);
});

/* ── Chi non sa, non apre ───────────────────────────────────────────────── */

test('nessuna sessione non è un via libera', () => {
  const { G } = carica('{}');
  const e = G.controlla(null, {});
  assert.equal(e.azione, 'esci');
  assert.equal(e.causa, 'sessione');
});

test('una sessione scaduta manda a riaccedere', async () => {
  const { G, sessione } = await conAccount();
  const e = G.controlla(sessione, { quando: new Date(Date.now() + 40 * 86400000).toISOString() });
  assert.equal(e.azione, 'esci');
  assert.equal(e.causa, 'sessione');
  assert.equal(e.scaduta, true);
});

test('una sessione che si è scritta i diritti dentro non vale', async () => {
  const { G, sessione } = await conAccount();
  const e = G.controlla(Object.assign({}, sessione, { plan: 'business' }), {});
  assert.equal(e.azione, 'esci');
  assert.equal(e.manomessa, true, 'un campo `plan` aggiunto a mano ha aperto la porta');
});

test('una sessione senza scadenza non è una sessione eterna', async () => {
  const { G, sessione } = await conAccount();
  const rotta = Object.assign({}, sessione);
  delete rotta.scade;
  assert.equal(G.controlla(rotta, {}).azione, 'esci');
});

test('un account cancellato dall\'archivio non resta dentro', async () => {
  const { G, sessione, db, scrivi } = await conAccount();
  const d = db(); d.users = []; scrivi(d);
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'esci');
  assert.equal(e.causa, 'account');
});

test('un archivio illeggibile non è un via libera', async () => {
  const { G, sessione, store } = await conAccount();
  store.set('ingly_saas_db', '{ rotto');
  assert.notEqual(G.controlla(sessione, {}).azione, 'entra');
});

/* ── Blocco, non espulsione ─────────────────────────────────────────────── */

test('l\'abbonamento scaduto blocca ma non butta fuori: si deve poter rinnovare', async () => {
  const { G, C, sessione, utente, db, scrivi } = await conAccount();
  const d = db();
  d.subscriptions[0].trial_end = new Date(Date.now() - 86400000).toISOString();
  d.subscriptions[0].current_period_end = new Date(Date.now() - 86400000).toISOString();
  scrivi(d);
  assert.equal(C.stato(C.perId(utente.id)).ok, false, 'l\'abbonamento è ancora buono');
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'blocco');
  assert.equal(e.causa, 'abbonamento');
  assert.ok(e.messaggio);
});

test('la schermata del blocco offre una via d\'uscita, non solo un muro', async () => {
  const { G } = await conAccount();
  const html = G.schermata({ causa: 'abbonamento', messaggio: 'Prova finita' });
  assert.ok(html.includes('Riattiva'), html.slice(0, 200));
  assert.ok(html.includes('InglyGuardia.esci()'));
  assert.ok(html.includes('Prova finita'));
});

test('un account sospeso è un blocco con causa diversa, e senza pulsante di rinnovo', async () => {
  const { G, C, sessione, utente } = await conAccount();
  C.cambiaStato(utente.id, 'suspended', { motivo: 'test' });
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'blocco');
  assert.equal(e.causa, 'account');
  assert.equal(G.schermata(e).includes('Riattiva l’abbonamento'), false,
    'a un account sospeso non si vende un rinnovo');
});

test('il messaggio del blocco non espone dettagli interni', async () => {
  const { G, C, sessione, utente } = await conAccount();
  C.cambiaStato(utente.id, 'banned', { motivo: 'abuso' });
  const html = G.schermata(G.controlla(sessione, {}));
  assert.equal(html.includes('password_hash'), false);
  assert.equal(html.includes('pbkdf2'), false);
});

test('la schermata sfugge l\'HTML che le arriva', async () => {
  const { G } = await conAccount();
  const html = G.schermata({ causa: 'account', messaggio: '<img src=x onerror=alert(1)>' });
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('&lt;img'));
});

/* ── Dispositivo ────────────────────────────────────────────────────────── */

test('la postazione revocata da un altro dispositivo fa uscire', async () => {
  const { G, D, sessione, utente } = await conAccount();
  D.subentra(utente, { device_id: 'dev_altro' });
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'esci');
  assert.equal(e.causa, 'dispositivo');
  assert.equal(e.revocata, true);
});

test('una sessione senza dispositivo registrato non viene scambiata per revocata', async () => {
  const { G, sessione, db, scrivi } = await conAccount();
  const d = db(); d.device_sessions = []; scrivi(d);
  const s = Object.assign({}, sessione); delete s.device_id;
  assert.equal(G.controlla(s, {}).azione, 'entra');
});

/* ── L'ordine delle domande ─────────────────────────────────────────────── */

test('la sessione si controlla prima dell\'account: non si legge l\'archivio per niente', () => {
  const { G } = carica('{ rotto');
  const e = G.controlla(null, {});
  assert.equal(e.causa, 'sessione', 'con archivio illeggibile ha risposto «account»');
});

test('senza il modulo che sa rispondere, la guardia non apre', async () => {
  const { ctx, G, sessione } = await conAccount();
  ctx.InglyAccount = null;
  const e = G.controlla(sessione, {});
  assert.equal(e.azione, 'esci');
  assert.equal(e.causa, 'sistema');
});

/* ── Effetti ────────────────────────────────────────────────────────────── */

test('`applica` con agisci:false decide senza fare niente', async () => {
  const { G, C, sessione, utente } = await conAccount();
  C.cambiaStato(utente.id, 'suspended', {});
  const e = G.applica({ sessione: sessione, agisci: false });
  assert.equal(e.azione, 'blocco');
  assert.equal(G.ultimo().azione, 'blocco', 'l\'ultima decisione non è consultabile');
});

test('entrare tiene viva la postazione', async () => {
  const { G, sessione, db, scrivi } = await conAccount();
  const d = db();
  d.device_sessions[0].last_seen = new Date(Date.now() - 5 * 60000).toISOString();
  scrivi(d);
  const prima = db().device_sessions[0].last_seen;
  G.applica({ sessione: sessione });
  assert.notEqual(db().device_sessions[0].last_seen, prima, 'il battito non è arrivato');
});

test('senza documento il ciclo non parte e lo dice', async () => {
  const { G } = await conAccount();
  const r = G.avvia({});
  assert.equal(r.ok, false);
  assert.equal(G.attiva(), false);
});

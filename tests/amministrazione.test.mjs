/* L'amministrazione del workspace: permessi, isolamento, e — soprattutto —
   che non abbia una seconda idea di come si crea, si sospende e si reimposta
   un account. Due implementazioni di una cosa sola divergono sempre; qui si
   verifica che ne resti una. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const MODULI = ['plan-catalog.js', 'subscription.js', 'entitlements.js', 'auth-identity.js',
  'device-sessions.js', 'account-service.js', 'admin-view.js'];

function carica() {
  const store = new Map([['ingly_saas_db', '{}']]);
  const sess = new Map();
  const ctx = {
    console, crypto: globalThis.crypto, TextEncoder, Buffer,
    navigator: { userAgent: 'Chrome/130.0 Windows NT 10.0', platform: 'Win32' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
    sessionStorage: {
      getItem: (k) => (sess.has(k) ? sess.get(k) : null),
      setItem: (k, v) => { sess.set(k, String(v)); },
      removeItem: (k) => { sess.delete(k); },
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of MODULI) {
    vm.runInContext(fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
  }
  return {
    ctx, A: ctx.InglyAmministrazione, C: ctx.InglyAccount, D: ctx.InglyDispositivi,
    db: () => JSON.parse(store.get('ingly_saas_db') || '{}'),
    entra: (s) => sess.set('ingly_saas_session', JSON.stringify(s)),
  };
}

async function conProprietario() {
  const h = carica();
  const r = await h.C.crea({
    nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, { ruolo: 'owner', prova: false });
  assert.equal(r.ok, true, r.motivo);
  h.entra(r.sessione);
  return Object.assign(h, { proprietario: r.utente, sessione: r.sessione });
}

/* ── Permessi ───────────────────────────────────────────────────────────── */

test('chi non amministra non aggiunge persone', async () => {
  const { A, entra, sessione } = await conProprietario();
  entra(Object.assign({}, sessione, { ruolo: 'operator' }));
  const e = await A.creaUtente({ nome: 'X', email: 'x@ingly.it', password: 'Laboratorio2026' });
  assert.equal(e.ok, false);
  assert.match(e.motivo, /permessi/);
});

test('senza sessione non si amministra niente', () => {
  const { A } = carica();
  assert.equal(A.cambiaStato('usr_1', 'suspended').ok, false);
  assert.equal(A.cambiaRuolo('usr_1', 'admin').ok, false);
});

/* ── Creazione: un solo modo di costruire un account ────────────────────── */

test('la persona aggiunta entra nel workspace di chi la aggiunge, non in uno nuovo', async () => {
  const { A, db, proprietario } = await conProprietario();
  const e = await A.creaUtente({
    nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026', ruolo: 'operator',
  });
  assert.equal(e.ok, true, e.motivo);
  const d = db();
  assert.equal(d.users.length, 2);
  assert.equal(e.utente.tenant_id, proprietario.tenant_id);
  assert.equal(d.tenants.length, 1, 'ha creato un secondo workspace');
  assert.equal(d.subscriptions.length, 1, 'ha creato un secondo abbonamento');
});

test('la persona aggiunta ha una password cifrata, come tutti', async () => {
  const { A, db } = await conProprietario();
  await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  const u = db().users.find((x) => x.email === 'rosa@ingly.it');
  assert.ok(u.password_hash.startsWith('pbkdf2$'));
  assert.equal(JSON.stringify(db()).includes('Laboratorio2026'), false);
});

test('aggiungere una persona lascia una traccia in audit', async () => {
  const { A, db } = await conProprietario();
  await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  const create = db().audit_log.filter((v) => v.action === 'account.created');
  assert.equal(create.length, 2, 'la creazione dall\'amministrazione non è registrata');
});

test('non si aggiunge due volte la stessa email', async () => {
  const { A } = await conProprietario();
  assert.equal((await A.creaUtente({ nome: 'R', email: 'rosa@ingly.it', password: 'Laboratorio2026' })).ok, true);
  const due = await A.creaUtente({ nome: 'R', email: 'ROSA@ingly.it', password: 'Laboratorio2026' });
  assert.equal(due.ok, false);
  assert.equal(due.campo, 'email');
});

test('non si crea un secondo proprietario', async () => {
  const { A } = await conProprietario();
  const e = await A.creaUtente({
    nome: 'R', email: 'rosa@ingly.it', password: 'Laboratorio2026', ruolo: 'owner',
  });
  assert.equal(e.ok, false);
  assert.equal(e.campo, 'ruolo');
});

test('una password debole non passa nemmeno dall\'amministrazione', async () => {
  const { A } = await conProprietario();
  const e = await A.creaUtente({ nome: 'R', email: 'rosa@ingly.it', password: 'abc' });
  assert.equal(e.ok, false);
  assert.equal(e.campo, 'password');
});

/* ── Sospensione: una sola sospensione ──────────────────────────────────── */

test('sospendere dall\'amministrazione chiude anche le postazioni', async () => {
  const { A, D, db } = await conProprietario();
  const e = await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  /* Rosa entra da un suo dispositivo. */
  D.registra(e.utente, { device_id: 'dev_rosa' });
  assert.equal(D.attive(e.utente.id).length, 1);

  const s = A.cambiaStato(e.utente.id, 'suspended');
  assert.equal(s.ok, true, s.motivo);
  assert.equal(D.attive(e.utente.id).length, 0, 'la postazione è rimasta aperta');
  assert.ok(db().audit_log.some((v) => v.action === 'account.status_changed'));
});

test('il proprietario non si sospende, e nessuno sospende se stesso', async () => {
  const { A, proprietario } = await conProprietario();
  const e = A.cambiaStato(proprietario.id, 'suspended');
  assert.equal(e.ok, false);
});

test('non si tocca chi sta in un altro workspace', async () => {
  const { A, C, db } = await conProprietario();
  const altro = await C.crea({
    nome: 'Altro', laboratorio: 'Altrove', email: 'a@altrove.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  assert.equal(altro.ok, true, altro.motivo);
  const e = A.cambiaStato(altro.utente.id, 'suspended');
  assert.equal(e.ok, false);
  assert.match(e.motivo, /altro workspace/);
  assert.equal(db().users.find((u) => u.id === altro.utente.id).status, 'active');
});

/* ── Reimpostazione password ────────────────────────────────────────────── */

test('reimpostare la password chiude le sessioni di quella persona', async () => {
  const { A, D, db } = await conProprietario();
  const e = await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  D.registra(e.utente, { device_id: 'dev_rosa' });
  const prima = db().users.find((u) => u.id === e.utente.id).password_hash;

  const r = await A.reimpostaPassword(e.utente.id, 'Reimpostata2026');
  assert.equal(r.ok, true, r.motivo);
  assert.notEqual(db().users.find((u) => u.id === e.utente.id).password_hash, prima);
  assert.equal(D.attive(e.utente.id).length, 0);
  assert.ok(db().audit_log.some((v) => v.action === 'account.password_reset'));
  assert.equal(JSON.stringify(db().audit_log).includes('Reimpostata2026'), false);
});

test('la password reimpostata non finisce in chiaro in archivio', async () => {
  const { A, db } = await conProprietario();
  const e = await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  await A.reimpostaPassword(e.utente.id, 'Reimpostata2026');
  assert.equal(JSON.stringify(db()).includes('Reimpostata2026'), false);
});

test('non si reimposta la password di un altro workspace', async () => {
  const { A, C } = await conProprietario();
  const altro = await C.crea({
    nome: 'Altro', laboratorio: 'Altrove', email: 'a@altrove.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  const e = await A.reimpostaPassword(altro.utente.id, 'Reimpostata2026');
  assert.equal(e.ok, false);
});

/* ── Lettura per la schermata ───────────────────────────────────────────── */

test('le postazioni mostrate sono solo quelle del proprio workspace', async () => {
  const { A, C, D, proprietario } = await conProprietario();
  const rosa = await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  D.registra(rosa.utente, { device_id: 'dev_rosa' });
  const altro = await C.crea({
    nome: 'Altro', laboratorio: 'Altrove', email: 'a@altrove.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  D.registra(altro.utente, { device_id: 'dev_estraneo' });

  const p = A.postazioni(proprietario.tenant_id);
  const dispositivi = p.map((x) => x.device_id);
  assert.equal(dispositivi.includes('dev_rosa'), true);
  assert.equal(dispositivi.includes('dev_estraneo'), false, 'vede le postazioni di un altro workspace');
});

test('l\'attività mostrata è quella del proprio workspace, dalla più recente', async () => {
  const { A, proprietario } = await conProprietario();
  await A.creaUtente({ nome: 'Rosa', email: 'rosa@ingly.it', password: 'Laboratorio2026' });
  const v = A.attivita(proprietario.tenant_id, 5);
  assert.ok(v.length >= 2);
  assert.equal(v.every((x) => String(x.tenant_id) === String(proprietario.tenant_id)), true);
  assert.ok(Date.parse(v[0].at) >= Date.parse(v[v.length - 1].at), 'non è dal più recente');
});

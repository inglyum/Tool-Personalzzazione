/* Il ciclo di vita dell'account, da fuori: registrazione atomica, stati,
   password. Il difetto da cui nasce questo file è un pulsante rimasto
   «Creazione in corso…» per sempre; i test qui sotto esistono perché
   quella condizione non possa più prodursi in silenzio. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function carica(archivioIniziale) {
  const store = new Map();
  if (archivioIniziale !== undefined) store.set('ingly_saas_db', archivioIniziale);
  const ctx = {
    console, crypto: globalThis.crypto, TextEncoder, Buffer,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['plan-catalog.js', 'subscription.js', 'auth-identity.js', 'account-service.js']) {
    vm.runInContext(fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
  }
  return { ctx, C: ctx.InglyAccount, store, db: () => JSON.parse(store.get('ingly_saas_db') || '{}') };
}

const BUONO = {
  nome: 'Giuseppe', laboratorio: 'INGLY Design',
  email: 'Giuseppe@Ingly.IT', password: 'Laboratorio2026', conferma: 'Laboratorio2026',
  termini: true,
};

/* ── Validazione ────────────────────────────────────────────────────────── */

test('la validazione dice tutti gli errori in una volta, non uno per volta', () => {
  const { C } = carica();
  const v = C.valida({ email: 'non-una-email', password: 'abc' }, { richiediTermini: true });
  assert.equal(v.ok, false);
  const campi = v.errori.map((e) => e.campo).sort().join('|');
  assert.equal(campi, 'email|laboratorio|nome|password|termini');
});

test('i termini si richiedono solo dove sono dichiarati', () => {
  const { C } = carica();
  const senza = C.valida(Object.assign({}, BUONO, { termini: false }), {});
  assert.equal(senza.ok, true, 'il primo avvio di un\'installazione propria non è una sottoscrizione');
  const con = C.valida(Object.assign({}, BUONO, { termini: false }), { richiediTermini: true });
  assert.equal(con.ok, false);
});

test('l\'email si normalizza prima di essere confrontata', () => {
  const { C } = carica();
  assert.equal(C.valida(BUONO, {}).email, 'giuseppe@ingly.it');
});

/* ── Creazione ──────────────────────────────────────────────────────────── */

test('la creazione produce utente, workspace, appartenenza, abbonamento e sessione', async () => {
  const { C, db } = carica('{}');
  const r = await C.crea(BUONO, { richiediTermini: true });
  assert.equal(r.ok, true, r.motivo);
  const d = db();
  assert.equal(d.users.length, 1);
  assert.equal(d.tenants.length, 1);
  assert.equal(d.memberships.length, 1);
  assert.equal(d.subscriptions.length, 1);
  assert.equal(d.users[0].tenant_id, d.tenants[0].id);
  assert.equal(d.memberships[0].user_id, d.users[0].id);
  assert.equal(r.sessione.user_id, d.users[0].id);
});

test('ogni fase dichiara il proprio esito: nessun passaggio muto', async () => {
  const { C } = carica('{}');
  const r = await C.crea(BUONO, {});
  const nomi = r.fasi.map((f) => f.fase).join('|');
  for (const atteso of ['validazione', 'unicita', 'identita', 'profilo', 'workspace',
    'appartenenza', 'abbonamento', 'scrittura', 'sessione']) {
    assert.ok(nomi.includes(atteso), 'manca la fase ' + atteso + ' in ' + nomi);
  }
  assert.equal(r.fasi.every((f) => f.ok), true, JSON.stringify(r.fasi));
});

test('la password non finisce mai nell\'archivio in chiaro', async () => {
  const { C, store } = carica('{}');
  await C.crea(BUONO, {});
  const grezzo = store.get('ingly_saas_db');
  assert.equal(grezzo.includes('Laboratorio2026'), false, 'la password è nell\'archivio');
  const u = JSON.parse(grezzo).users[0];
  assert.ok(u.password_hash.startsWith('pbkdf2$'));
  assert.equal(u.password, undefined);
});

test('la sessione non porta diritti: né piano, né moduli, né scadenza di licenza', async () => {
  const { C } = carica('{}');
  const r = await C.crea(BUONO, {});
  for (const k of ['plan', 'modules', 'expiresAt', 'password_hash', 'passwordHash']) {
    assert.equal(r.sessione[k], undefined, 'la sessione porta ' + k);
  }
});

test('la stessa email non crea due account, comunque la si scriva', async () => {
  const { C, db } = carica('{}');
  assert.equal((await C.crea(BUONO, {})).ok, true);
  const due = await C.crea(Object.assign({}, BUONO, { email: '  GIUSEPPE@ingly.it ' }), {});
  assert.equal(due.ok, false);
  assert.equal(due.campo, 'email');
  assert.equal(db().users.length, 1);
});

test('una validazione fallita non lascia niente in archivio', async () => {
  const { C, db } = carica('{}');
  const r = await C.crea({ nome: 'x', laboratorio: 'y', email: 'rotta', password: 'abc' }, {});
  assert.equal(r.ok, false);
  const d = db();
  assert.equal((d.users || []).length, 0);
  assert.equal((d.tenants || []).length, 0);
  assert.equal((d.subscriptions || []).length, 0);
});

test('un archivio illeggibile ferma la creazione: non ci si scrive sopra', async () => {
  const { C, store } = carica('{ questo non è JSON');
  const r = await C.crea(BUONO, {});
  assert.equal(r.ok, false);
  assert.match(r.motivo, /non leggibile/);
  assert.equal(store.get('ingly_saas_db'), '{ questo non è JSON', 'l\'archivio è stato sovrascritto');
});

test('la creazione non cancella quello che c\'era già', async () => {
  const { C, db } = carica(JSON.stringify({
    users: [], admins: [{ id: 'adm_1' }], catalog: [{ id: 'p1' }],
  }));
  assert.equal((await C.crea(BUONO, {})).ok, true);
  const d = db();
  assert.equal(d.admins.length, 1, 'gli admin della console sono spariti');
  assert.equal(d.catalog.length, 1);
});

test('il doppio clic non crea due account', async () => {
  const { C, db } = carica('{}');
  const a = C.crea(BUONO, {});
  const b = C.crea(BUONO, {});
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(db().users.length, 1);
  assert.equal(ra.ok !== rb.ok, true, 'una sola delle due deve riuscire');
  const respinta = ra.ok ? rb : ra;
  assert.equal(respinta.inCorso, true);
});

test('«in corso» non resta acceso, né dopo un successo né dopo un errore', async () => {
  const { C } = carica('{}');
  await C.crea(BUONO, {});
  assert.equal(C.inCorso(), false);
  await C.crea({ email: 'rotta' }, {});
  assert.equal(C.inCorso(), false, 'il difetto originale: bloccato per sempre');
});

test('chi si registra riceve la prova; il proprietario riceve l\'abbonamento', async () => {
  const p = carica('{}');
  assert.equal((await p.C.crea(BUONO, {})).abbonamento.status, 'trial');
  const q = carica('{}');
  const r = await q.C.crea(BUONO, { prova: false, piano: 'business', intervallo: 'yearly' });
  assert.equal(r.abbonamento.status, 'active');
  assert.equal(r.abbonamento.plan_id, 'business');
});

test('la creazione lascia una traccia in audit', async () => {
  const { C, db } = carica('{}');
  await C.crea(BUONO, {});
  const voci = db().audit_log;
  assert.equal(voci.length, 1);
  assert.equal(voci[0].action, 'account.created');
  assert.equal(JSON.stringify(voci[0]).includes('Laboratorio2026'), false, 'la password è nell\'audit');
});

/* ── Stati ──────────────────────────────────────────────────────────────── */

test('le transizioni di stato sono dichiarate, non improvvisate', () => {
  const { C } = carica();
  assert.equal(C.transizioneValida('active', 'suspended').ok, true);
  assert.equal(C.transizioneValida('suspended', 'active').ok, true);
  assert.equal(C.transizioneValida('deleted', 'active').ok, false, 'da cancellato non si torna');
  assert.equal(C.transizioneValida('active', 'inventato').ok, false);
});

test('sospendere un account gli toglie l\'accesso e lo registra', async () => {
  const { C, db } = carica('{}');
  const r = await C.crea(BUONO, {});
  const s = C.cambiaStato(r.utente.id, 'suspended', { attore: 'adm_1', motivo: 'pagamento' });
  assert.equal(s.ok, true, s.motivo);
  assert.equal(C.perId(r.utente.id).status, 'suspended');
  assert.equal(C.stato(C.perId(r.utente.id)).ok, false);
  assert.equal(C.stato(C.perId(r.utente.id)).causa, 'account');
  assert.ok(db().audit_log.some((v) => v.action === 'account.status_changed'));
});

test('lo stato risponde a una domanda sola: account più abbonamento', async () => {
  const { C } = carica('{}');
  const r = await C.crea(BUONO, {});
  const s = C.stato(C.perId(r.utente.id));
  assert.equal(s.ok, true);
  assert.equal(s.causa, null);
  assert.equal(s.abbonamento.stato, 'trial');
});

test('un utente che non esiste non è un utente valido', () => {
  const { C } = carica('{}');
  assert.equal(C.stato(null).ok, false);
  assert.equal(C.perEmail('nessuno@ingly.it'), null);
});

/* ── Password ───────────────────────────────────────────────────────────── */

test('il cambio password richiede quella attuale', async () => {
  const { C } = carica('{}');
  const r = await C.crea(BUONO, {});
  const no = await C.cambiaPassword(r.utente.id, 'Sbagliata2026', 'Nuova2026aa');
  assert.equal(no.ok, false);
  assert.equal(no.campo, 'attuale');
  const si = await C.cambiaPassword(r.utente.id, 'Laboratorio2026', 'Nuova2026aa');
  assert.equal(si.ok, true, si.motivo);
  assert.notEqual(C.perId(r.utente.id).password_hash, r.utente.password_hash);
});

test('la nuova password deve essere diversa e robusta', async () => {
  const { C } = carica('{}');
  const r = await C.crea(BUONO, {});
  assert.equal((await C.cambiaPassword(r.utente.id, 'Laboratorio2026', 'Laboratorio2026')).ok, false);
  assert.equal((await C.cambiaPassword(r.utente.id, 'Laboratorio2026', 'abc')).ok, false);
});

test('il reimposto amministrativo non chiede la password attuale, ma lascia traccia', async () => {
  const { C, db } = carica('{}');
  const r = await C.crea(BUONO, {});
  const s = await C.reimpostaPassword(r.utente.id, 'Reimpostata2026', { attore: 'adm_1' });
  assert.equal(s.ok, true, s.motivo);
  const voci = db().audit_log.map((v) => v.action);
  assert.ok(voci.includes('account.password_reset'), voci.join('|'));
  assert.equal(db().audit_log.some((v) => JSON.stringify(v).includes('Reimpostata2026')), false);
});

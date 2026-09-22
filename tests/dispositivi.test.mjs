/* Una postazione per abbonamento: la regola che rende l'abbonamento un
   abbonamento. Questi test tengono soprattutto le due cose che una policy
   del genere sbaglia sempre — chiudere fuori il legittimo proprietario, e
   lasciare occupata per sempre una scheda che nessuno ha chiuso. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const MODULI = ['plan-catalog.js', 'subscription.js', 'auth-identity.js',
  'device-sessions.js', 'account-service.js'];

function carica(archivioIniziale) {
  const store = new Map();
  if (archivioIniziale !== undefined) store.set('ingly_saas_db', archivioIniziale);
  const ctx = {
    console, crypto: globalThis.crypto, TextEncoder, Buffer,
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', platform: 'Win32' },
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
    ctx, D: ctx.InglyDispositivi, C: ctx.InglyAccount, store,
    db: () => JSON.parse(store.get('ingly_saas_db') || '{}'),
    scrivi: (d) => store.set('ingly_saas_db', JSON.stringify(d)),
  };
}

const UTENTE = { id: 'usr_1', tenant_id: 'ws_1' };

/* ── Identità del dispositivo ───────────────────────────────────────────── */

test('l\'identificativo del dispositivo nasce una volta e resta', () => {
  const { D, store } = carica('{}');
  const a = D.corrente();
  assert.ok(a && a.startsWith('dev_'));
  assert.equal(D.corrente(), a, 'cambia a ogni chiamata');
  assert.equal(store.get('ingly_device_id'), a);
});

test('due installazioni diverse hanno identificativi diversi', () => {
  assert.notEqual(carica('{}').D.corrente(), carica('{}').D.corrente());
});

test('l\'etichetta è leggibile da una persona, non un user agent', () => {
  const { D } = carica('{}');
  assert.equal(D.etichetta('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'Win32'), 'Chrome su Windows');
  assert.equal(D.etichetta('Mozilla/5.0 (Macintosh) Version/17 Safari/605', 'MacIntel'), 'Safari su macOS');
  assert.equal(D.etichetta('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', ''), 'Chrome su Android');
});

/* ── Registrazione ──────────────────────────────────────────────────────── */

test('il primo dispositivo si registra senza chiedere niente', () => {
  const { D, db } = carica('{}');
  const r = D.registra(UTENTE, {});
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.nuova, true);
  assert.equal(db().device_sessions.length, 1);
  assert.equal(db().device_sessions[0].user_id, 'usr_1');
});

test('rientrare dallo stesso dispositivo non chiede di subentrare a se stessi', () => {
  const { D, db } = carica('{}');
  D.registra(UTENTE, {});
  const r = D.registra(UTENTE, {});
  assert.equal(r.ok, true);
  assert.equal(r.nuova, false, 'ha creato una seconda riga per lo stesso dispositivo');
  assert.equal(db().device_sessions.length, 1);
});

test('un secondo dispositivo non entra di nascosto: dichiara il conflitto', () => {
  const { D, db } = carica('{}');
  D.registra(UTENTE, {});
  const r = D.registra(UTENTE, { device_id: 'dev_altro' });
  assert.equal(r.ok, false);
  assert.equal(r.conflitto, true);
  assert.equal(r.limite, 1);
  assert.equal(r.occupate.length, 1);
  assert.ok(r.occupate[0].etichetta, 'il conflitto deve dire DA DOVE');
  assert.equal(db().device_sessions.length, 1, 'ha registrato lo stesso');
});

test('un piano con più postazioni ne accetta più di una', () => {
  const { D } = carica('{}');
  assert.equal(D.registra(UTENTE, { limite: 3 }).ok, true);
  assert.equal(D.registra(UTENTE, { limite: 3, device_id: 'dev_b' }).ok, true);
  assert.equal(D.registra(UTENTE, { limite: 3, device_id: 'dev_c' }).ok, true);
  assert.equal(D.registra(UTENTE, { limite: 3, device_id: 'dev_d' }).conflitto, true);
});

test('il limite di postazioni si legge dal piano, non è sempre uno', () => {
  const { ctx } = carica('{}');
  const D = ctx.InglyDispositivi;
  assert.equal(D.limiteDi('standard'), 1);
  assert.equal(D.limiteDi('premium'), 3);
  assert.equal(D.limiteDi('business'), 10);
  assert.equal(D.limiteDi('piano-inesistente'), D.LIMITE_PREDEFINITO, 'un piano sconosciuto non apre più del minimo');
});

test('registrarsi senza passare un limite esplicito usa quello del proprio piano', () => {
  const { D } = carica('{}');
  assert.equal(D.registra(UTENTE, { piano: 'premium' }).ok, true);
  assert.equal(D.registra(UTENTE, { piano: 'premium', device_id: 'dev_b' }).ok, true);
  assert.equal(D.registra(UTENTE, { piano: 'premium', device_id: 'dev_c' }).ok, true);
  assert.equal(D.registra(UTENTE, { piano: 'premium', device_id: 'dev_d' }).conflitto, true,
    'premium concede 3 postazioni, non di più');
});

test('la postazione di un altro utente non occupa la mia', () => {
  const { D } = carica('{}');
  D.registra({ id: 'usr_altro' }, { device_id: 'dev_x' });
  assert.equal(D.registra(UTENTE, { device_id: 'dev_y' }).ok, true);
});

/* ── Inattività ─────────────────────────────────────────────────────────── */

test('una scheda dimenticata non tiene occupata la postazione per sempre', () => {
  const { D, db, scrivi } = carica('{}');
  D.registra(UTENTE, {});
  const d = db();
  d.device_sessions[0].last_seen = new Date(Date.now() - 60 * 60000).toISOString();
  scrivi(d);
  assert.equal(D.attive('usr_1').length, 0, 'un\'ora di silenzio è ancora «attiva»');
  assert.equal(D.registra(UTENTE, { device_id: 'dev_nuovo' }).ok, true,
    'il proprietario resta chiuso fuori da una scheda che nessuno ha chiuso');
});

test('il battito tiene viva la postazione, ma non scrive a ogni colpo', () => {
  const { D, db, scrivi } = carica('{}');
  D.registra(UTENTE, {});
  const subito = D.battito('usr_1');
  assert.equal(subito.ok, true);
  assert.equal(subito.saltato, true, 'ha riscritto l\'archivio per niente');

  const d = db();
  d.device_sessions[0].last_seen = new Date(Date.now() - 10 * 60000).toISOString();
  scrivi(d);
  const dopo = D.battito('usr_1');
  assert.equal(dopo.ok, true);
  assert.equal(dopo.saltato, undefined);
  assert.equal(D.attive('usr_1').length, 1);
});

test('il battito di una sessione revocata dice di no', () => {
  const { D } = carica('{}');
  D.registra(UTENTE, {});
  D.revoca(D.corrente(), 'prova');
  assert.equal(D.battito('usr_1').ok, false);
});

/* ── Subentro ───────────────────────────────────────────────────────────── */

test('subentrare chiude l\'altra postazione e apre la propria', () => {
  const { D, db } = carica('{}');
  D.registra(UTENTE, { device_id: 'dev_vecchio' });
  const r = D.subentra(UTENTE, { device_id: 'dev_nuovo' });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.revocate, 1);
  const s = db().device_sessions;
  assert.equal(s.length, 2);
  const vecchia = s.find((x) => x.device_id === 'dev_vecchio');
  assert.equal(vecchia.active, false);
  assert.ok(vecchia.revoked_at);
  assert.equal(D.attive('usr_1').length, 1);
  assert.equal(D.attive('usr_1')[0].device_id, 'dev_nuovo');
});

test('il dispositivo sostituito lo scopre alla prima verifica', () => {
  const { D } = carica('{}');
  D.registra(UTENTE, { device_id: 'dev_vecchio' });
  assert.equal(D.verifica('usr_1', 'dev_vecchio').ok, true);
  D.subentra(UTENTE, { device_id: 'dev_nuovo' });
  const v = D.verifica('usr_1', 'dev_vecchio');
  assert.equal(v.ok, false);
  assert.equal(v.revocata, true);
  assert.match(v.motivo, /chiusa/);
});

test('la verifica non inventa una revoca dove non c\'è registrazione', () => {
  const { D } = carica('{}');
  const v = D.verifica('usr_1', 'dev_mai_visto');
  assert.equal(v.ok, true);
  assert.equal(v.registrato, false);
  assert.equal(v.motivo, null);
});

test('chi non sa non apre: un archivio illeggibile non è un via libera', () => {
  const { D } = carica('{ non è JSON');
  const v = D.verifica('usr_1', 'dev_a');
  assert.equal(v.ok, false);
  assert.equal(v.ignoto, true);
  assert.equal(D.registra(UTENTE, {}).ok, false);
});

/* ── Revoca ─────────────────────────────────────────────────────────────── */

test('revocare tutte non tocca gli altri utenti', () => {
  const { D } = carica('{}');
  D.registra(UTENTE, { device_id: 'dev_a' });
  D.registra(UTENTE, { device_id: 'dev_b', limite: 5 });
  D.registra({ id: 'usr_altro' }, { device_id: 'dev_c' });
  const r = D.revocaTutte('usr_1', 'sospensione');
  assert.equal(r.revocate, 2);
  assert.equal(D.attive('usr_1').length, 0);
  assert.equal(D.attive('usr_altro').length, 1);
});

test('ogni revoca lascia una traccia in audit', () => {
  const { D, db } = carica('{}');
  D.registra(UTENTE, {});
  D.revoca(D.corrente(), 'test');
  const azioni = db().audit_log.map((v) => v.action);
  assert.ok(azioni.includes('device.registered'), azioni.join('|'));
  assert.ok(azioni.includes('device.revoked'), azioni.join('|'));
});

test('revocare un dispositivo che non c\'è non è un errore né una scrittura', () => {
  const { D, db } = carica('{}');
  const r = D.revoca('dev_inesistente', 'x');
  assert.equal(r.ok, true);
  assert.equal(r.revocate, 0);
  assert.equal((db().audit_log || []).length, 0);
});

/* ── Integrazione con il ciclo di vita dell'account ─────────────────────── */

test('la creazione dell\'account registra il dispositivo nella stessa scrittura', async () => {
  const { C, db } = carica('{}');
  const r = await C.crea({
    nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  assert.equal(r.ok, true, r.motivo);
  assert.equal(db().device_sessions.length, 1);
  assert.equal(r.sessione.device_id, db().device_sessions[0].device_id);
});

test('sospendere l\'account chiude le postazioni, nella forma che il modulo legge', async () => {
  const { C, D, db } = carica('{}');
  const r = await C.crea({
    nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  C.cambiaStato(r.utente.id, 'suspended', { motivo: 'test' });
  assert.equal(D.attive(r.utente.id).length, 0);
  const v = D.verifica(r.utente.id, db().device_sessions[0].device_id);
  assert.equal(v.ok, false, 'InglyDispositivi non riconosce la revoca scritta da InglyAccount');
  assert.equal(v.revocata, true);
});

test('cambiare password chiude le postazioni, ed è leggibile allo stesso modo', async () => {
  const { C, D } = carica('{}');
  const r = await C.crea({
    nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  await C.cambiaPassword(r.utente.id, 'Laboratorio2026', 'Nuova2026aa');
  assert.equal(D.attive(r.utente.id).length, 0);
});

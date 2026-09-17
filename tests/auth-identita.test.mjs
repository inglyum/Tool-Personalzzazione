/* Le tre porte che erano aperte, e che questi test tengono chiuse:
   la password in chiaro, la sessione che porta i diritti, il fail-open. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { console, crypto: globalThis.crypto, TextEncoder, Buffer };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../src/product/auth-identity.js', import.meta.url), 'utf8'), ctx);
const I = ctx.InglyIdentita;

test('la password diventa un hash, non resta una password', async () => {
  const h = await I.cifra('Laboratorio2026');
  assert.ok(h.startsWith('pbkdf2$'), h.slice(0, 20));
  assert.equal(h.indexOf('Laboratorio2026'), -1, 'la password non compare nell\'hash');
});

test('l\'hash porta con sé i propri parametri', async () => {
  const h = await I.cifra('Laboratorio2026');
  const parti = h.split('$');
  assert.equal(parti.length, 4);
  assert.equal(parti[0], 'pbkdf2');
  assert.equal(Number(parti[1]), I.ITERAZIONI);
});

test('la stessa password dà due hash diversi', async () => {
  assert.notEqual(await I.cifra('uguale'), await I.cifra('uguale'), 'il sale serve a questo');
});

test('la verifica riconosce la password giusta e rifiuta quella sbagliata', async () => {
  const h = await I.cifra('Laboratorio2026');
  assert.equal((await I.verifica('Laboratorio2026', h)).ok, true);
  assert.equal((await I.verifica('Laboratorio2027', h)).ok, false);
  assert.equal((await I.verifica('', h)).ok, false);
});

test('una password in chiaro rimasta da prima NON viene accettata', async () => {
  const e = await I.verifica('standalone', 'standalone');
  assert.equal(e.ok, false);
  assert.equal(e.daMigrare, true, 'e si può dire all\'utente di reimpostarla');
});

test('inChiaro riconosce i valori non cifrati, per l\'audit', async () => {
  assert.equal(I.inChiaro('standalone'), true);
  assert.equal(I.inChiaro(await I.cifra('x')), false);
  assert.equal(I.inChiaro(''), false);
});

test('un hash malformato non passa', async () => {
  assert.equal((await I.verifica('x', 'pbkdf2$abc')).ok, false);
});

test('la robustezza dice che cosa manca, non solo che è debole', () => {
  const r = I.robustezza('abc');
  assert.equal(r.ok, false);
  assert.ok(r.problemi.includes('almeno 8 caratteri'));
  assert.ok(r.problemi.includes('almeno un numero'));
});

test('le password ovvie sono rifiutate anche se lunghe', () => {
  assert.equal(I.robustezza('standalone').ok, false);
  assert.equal(I.robustezza('password1').ok, false);
});

test('una password onesta passa', () => {
  assert.equal(I.robustezza('Laboratorio2026').ok, true);
  assert.equal(I.robustezza('Laboratorio2026!').livello, 'molto forte');
});

test('l\'email si normalizza e si valida', () => {
  assert.equal(I.normalizzaEmail('  Mario@ROSSI.it '), 'mario@rossi.it');
  assert.equal(I.emailValida('mario@rossi.it'), true);
  assert.equal(I.emailValida('mario@rossi'), false);
  assert.equal(I.emailValida('mario rossi@x.it'), false);
  assert.equal(I.emailValida(''), false);
});

/* ── La sessione ────────────────────────────────────────────────────────── */

test('la sessione porta chi sei, non che cosa puoi fare', () => {
  const s = I.creaSessione({ id: 'u1', email: 'a@b.it', tenant_id: 't1' });
  assert.equal('plan' in s, false, 'era qui che si cambiava piano da localStorage');
  assert.equal('modules' in s, false);
  assert.equal('passwordHash' in s, false);
  assert.equal('password_hash' in s, false);
  assert.equal('expiresAt' in s, false);
  assert.equal(s.user_id, 'u1');
  assert.equal(s.tenant_id, 't1');
});

test('una sessione senza workspace non è valida', () => {
  const s = I.creaSessione({ id: 'u1', email: 'a@b.it' });
  assert.equal(I.sessioneValida(s).ok, false);
  assert.match(I.sessioneValida(s).motivo, /workspace/);
});

test('una sessione senza scadenza non è eterna: è invalida', () => {
  assert.equal(I.sessioneValida({ user_id: 'u1', tenant_id: 't1' }).ok, false);
});

test('una sessione scaduta non vale', () => {
  const s = I.creaSessione({ id: 'u1', email: 'a@b.it', tenant_id: 't1' },
    { adesso: '2026-01-01T00:00:00.000Z' });
  const e = I.sessioneValida(s, '2026-06-01T00:00:00.000Z');
  assert.equal(e.ok, false);
  assert.equal(e.scaduta, true);
});

test('una sessione a cui qualcuno ha aggiunto un piano viene rifiutata', () => {
  const s = I.creaSessione({ id: 'u1', email: 'a@b.it', tenant_id: 't1' });
  const manomessa = Object.assign({}, s, { plan: 'business' });
  const e = I.sessioneValida(manomessa);
  assert.equal(e.ok, false);
  assert.equal(e.manomessa, true);
});

test('«ricordami» allunga la sessione, non la rende eterna', () => {
  const corta = I.creaSessione({ id: 'u', email: 'a@b.it', tenant_id: 't' });
  const lunga = I.creaSessione({ id: 'u', email: 'a@b.it', tenant_id: 't' }, { ricordami: true });
  assert.ok(Date.parse(lunga.scade) > Date.parse(corta.scade));
  assert.ok(isFinite(Date.parse(lunga.scade)), 'ha comunque una fine');
});

/* ── Stati dell'account ─────────────────────────────────────────────────── */

test('solo un account attivo può entrare', () => {
  assert.equal(I.statoAccount({ status: 'active' }).puoAccedere, true);
  assert.equal(I.statoAccount({ status: 'suspended' }).puoAccedere, false);
  assert.equal(I.statoAccount({ status: 'banned' }).puoAccedere, false);
  assert.equal(I.statoAccount({ status: 'pending_verification' }).puoAccedere, false);
});

test('ogni stato bloccante ha un messaggio per l\'utente, senza dettagli tecnici', () => {
  ['suspended', 'banned', 'pending_verification'].forEach((s) => {
    const m = I.statoAccount({ status: s }).messaggio;
    assert.ok(m && m.length > 10, s);
    assert.equal(/error|exception|null|undefined/i.test(m), false, s + ': ' + m);
  });
});

test('uno stato sconosciuto non diventa un permesso', () => {
  /* Un valore fuori elenco viene ricondotto ad «attivo» soltanto perché i
     record storici non hanno il campo: gli stati bloccanti sono espliciti. */
  assert.equal(I.statoAccount({ status: 'qualcosa' }).stato, 'active');
  assert.equal(I.statoAccount({}).puoAccedere, true);
});

/* ── Accessor canonici (SEC-009) ─────────────────────────────────────────
   `handleCmd`, il canale realtime e il polling di ripiego del Cloud Sync
   leggevano `s.userId`, `s.id`, `session.username`, `s.passwordHash` —
   nessuno di questi esiste sulla sessione vera. Ogni comando
   dell'amministratore e ogni evento dal cloud venivano scartati in
   silenzio. Questi test tengono fermo che l'unico modo corretto di
   leggere un campo di sessione è questo, non un accesso diretto scritto
   di nuovo in ogni modulo. */

test('idUtente legge lo stesso campo che creaSessione scrive', () => {
  const s = I.creaSessione({ id: 'usr_1', email: 'a@b.it', tenant_id: 't1' });
  assert.equal(I.idUtente(s), 'usr_1');
  assert.equal(I.idUtente(s), s.user_id);
});

test('gli accessor non inventano campi che la sessione non ha', () => {
  const s = I.creaSessione({ id: 'usr_1', email: 'a@b.it', tenant_id: 't1' });
  assert.equal(s.userId, undefined, 'la sessione non deve avere userId');
  assert.equal(s.id, undefined, 'la sessione non deve avere id');
  assert.equal(s.username, undefined, 'la sessione non deve avere username');
  assert.equal(s.passwordHash, undefined, 'la sessione non deve avere passwordHash');
});

test('gli accessor su una sessione assente non lanciano, rispondono null', () => {
  assert.equal(I.idUtente(null), null);
  assert.equal(I.emailSessione(undefined), null);
  assert.equal(I.tenantId(null), null);
  assert.equal(I.deviceId(null), null);
});

test('emailSessione e tenantId leggono i campi giusti', () => {
  const s = I.creaSessione({ id: 'usr_2', email: 'Mario@Belice.IT', tenant_id: 'ws_9' }, { modalita: 'locale' });
  assert.equal(I.emailSessione(s), 'mario@belice.it');
  assert.equal(I.tenantId(s), 'ws_9');
});

test('deviceId legge il campo aggiunto dopo la registrazione della postazione', () => {
  const s = I.creaSessione({ id: 'usr_3', email: 'a@b.it', tenant_id: 't1' });
  assert.equal(I.deviceId(s), null, 'nessuna postazione ancora assegnata');
  s.device_id = 'dev_abc';
  assert.equal(I.deviceId(s), 'dev_abc');
});

/* L'audit di sicurezza, scritto come test invece che come documento.
   Un documento che elenca le regole invecchia; un test che le verifica no.

   Ogni regola qui sotto corrisponde a un difetto che in questo codice c'è
   stato davvero, o che stava per esserci. Se una di queste fallisce, qualcosa
   è rientrato dalla finestra. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RADICE = new URL('../src/', import.meta.url).pathname;

function tuttiJs(dir, out = []) {
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name);
    if (v.isDirectory()) tuttiJs(p, out);
    else if (/\.(js|mjs|html)$/.test(v.name)) out.push(p);
  }
  return out;
}

const FILE = tuttiJs(RADICE);
const rel = (f) => path.relative(RADICE, f);

/* I commenti spiegano che cosa è stato tolto e ne citano i nomi: cercare
   dentro i commenti farebbe scattare i test sulla propria documentazione. */
const senzaCommenti = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const SORGENTI = FILE.map((f) => ({ f, src: senzaCommenti(fs.readFileSync(f, 'utf8')) }));

function cerca(re, filtro) {
  const colpiti = [];
  for (const { f, src } of SORGENTI) {
    if (filtro && !filtro(rel(f))) continue;
    const righe = src.split('\n');
    righe.forEach((r, i) => { if (re.test(r)) colpiti.push(rel(f) + ':' + (i + 1) + ' → ' + r.trim().slice(0, 120)); });
  }
  return colpiti;
}

/* ── Segreti ────────────────────────────────────────────────────────────── */

test('nessuna chiave service_role nel front-end', () => {
  const c = cerca(/service_role/i);
  assert.deepEqual(c, [], 'la chiave che scavalca ogni politica non sta in un browser');
});

test('nessuna chiave segreta scritta nel sorgente', () => {
  const c = cerca(/(secret|api_?key|apikey|private_key|access_token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i);
  assert.deepEqual(c, []);
});

test('nessuna password scritta nel sorgente', () => {
  const c = cerca(/(password|passwordHash|password_hash)\s*[:=]\s*['"][^'"]{3,}['"]/i)
    /* `type="password"`, `autocomplete="new-password"` e simili non sono
       credenziali: sono attributi di un campo. */
    .filter((r) => !/type|autocomplete|placeholder|aria-|label|name=|id=|for=|'password'|"password"/i.test(r));
  assert.deepEqual(c, []);
});

test('nessun token di accesso finisce in localStorage', () => {
  const c = cerca(/localStorage\.setItem\(\s*['"][^'"]*(token|secret|password)[^'"]*['"]/i)
    /* Una scadenza non è un token: è un numero che dice quando chiederne uno
       nuovo, e serve proprio a non tenere il token. */
    .filter((r) => !/token_expiry/.test(r));
  assert.deepEqual(c, []);
});

/* SEC-004: `PaymentWizard` chiedeva al laboratorio la Stripe Secret Key
   reale e la salvava in chiaro in IndexedDB — una chiave capace di muovere
   denaro del cliente, non del prodotto. Il campo è stato sostituito da un
   link di pagamento pubblico (Stripe Payment Links), non sensibile. */
test('nessun modulo chiede di incollare una Stripe secret key', () => {
  const c = cerca(/placeholder\s*=\s*["']sk_(live|test)_/i);
  assert.deepEqual(c, [], 'un campo che chiede sk_live_/sk_test_ chiede una chiave capace di muovere denaro del cliente');
});

/* Il pannello Stripe dell'amministrazione aveva un campo «Webhook Secret»
   salvato in localStorage: nessun percorso lo leggeva per verificare una
   firma, ma un segreto capace di autenticare chiamate Stripe non ha alcun
   uso legittimo lato browser. Va nell'ambiente server / Edge Function. */
test('nessun webhook secret Stripe viene scritto in localStorage', () => {
  const c = cerca(/localStorage\.setItem\(\s*['"]ingly_stripe_wh['"]/i);
  assert.deepEqual(c, []);
});

/* ── Porte di servizio ──────────────────────────────────────────────────── */

test('nessuna credenziale predefinita, nessun bypass', () => {
  const c = cerca(/MASTER_CREDENTIALS|EMERGENCY[_ ]BYPASS|BYPASS_AUTH|skipAuth|bypassAuth/i);
  assert.deepEqual(c, []);
});

test('nessun confronto di password in chiaro', () => {
  const c = cerca(/(password|pass|pwd)\s*===?\s*(u|user|adm|admin|acc)\.(password|passwordHash|password_hash)/i);
  assert.deepEqual(c, []);
});

/* ── Diritti ────────────────────────────────────────────────────────────── */

test('la sessione non viene mai riempita di diritti', () => {
  /* Il difetto: `session.plan = …`, `session.modules = …`. Una sessione che
     porta i diritti è una sessione che si può modificare per ottenerli. */
  const c = cerca(/\b(session|sessione|s)\.(plan|modules|entitlements)\s*=[^=]/)
    .filter((r) => !/tests?\//.test(r));
  assert.deepEqual(c, [], 'i diritti si rileggono dall\'abbonamento, non si memorizzano');
});

test('nessun modulo del prodotto si concede diritti da solo', () => {
  const c = cerca(/(isAdmin|is_admin|isPremium|hasPro)\s*=\s*true/i);
  assert.deepEqual(c, []);
});

test('la fatturazione non può dichiarare pagato un abbonamento', () => {
  const b = SORGENTI.find((x) => rel(x.f) === 'product/billing.js');
  assert.ok(b, 'billing.js non trovato');
  assert.equal(/status\s*:\s*['"]active['"]/.test(b.src), false);
  assert.equal(/\bmock|\bfake|simula/i.test(b.src), false,
    'un adattatore finto è entrato nel percorso di produzione');
});

/* ── Isolamento fra workspace ───────────────────────────────────────────── */

test('l\'amministrazione non accetta un tenant_id da fuori', () => {
  const a = SORGENTI.find((x) => rel(x.f) === 'product/admin-view.js');
  assert.ok(a);
  /* `creaUtente` prende il workspace da chi è connesso. Accettarlo come
     parametro vorrebbe dire creare utenti dentro il workspace di qualcun
     altro. */
  assert.equal(/tenant_id:\s*d\.tenant_id/.test(a.src), false);
  assert.ok(/tenant_id:\s*s\.tenant_id/.test(a.src), 'il workspace deve venire dalla sessione');
});

test('ogni operazione dell\'amministrazione verifica il workspace', () => {
  const a = SORGENTI.find((x) => rel(x.f) === 'product/admin-view.js');
  const quante = (a.src.match(/Utente di un altro workspace/g) || []).length;
  assert.ok(quante >= 3, 'solo ' + quante + ' operazioni controllano il workspace');
});

/* ── Fail-closed ────────────────────────────────────────────────────────── */

test('chi non riesce a leggere l\'archivio non apre', () => {
  for (const nome of ['product/account-service.js', 'product/device-sessions.js', 'product/billing.js']) {
    const m = SORGENTI.find((x) => rel(x.f) === nome);
    assert.ok(m, nome + ' non trovato');
    assert.ok(/Archivio non leggibile/.test(m.src), nome + ' non gestisce l\'archivio illeggibile');
  }
});

test('la guardia non ha una via che restituisce «entra» senza controllare', () => {
  const g = SORGENTI.find((x) => rel(x.f) === 'product/auth-guard.js');
  assert.ok(g);
  const entrate = (g.src.match(/_esito\('entra'/g) || []).length;
  assert.equal(entrate, 1, 'ci sono ' + entrate + ' modi di dire «entra»: deve essercene uno');
});

/* ── Iniezione ──────────────────────────────────────────────────────────── */

test('i moduli nuovi sfuggono l\'HTML che stampano', () => {
  for (const nome of ['product/auth-guard.js', 'product/sicurezza-view.js', 'product/admin-view.js']) {
    const m = SORGENTI.find((x) => rel(x.f) === nome);
    assert.ok(m, nome);
    assert.ok(/function esc\(/.test(m.src), nome + ' non ha una funzione di escape');
  }
});

test('nessun dato dell\'utente finisce in innerHTML senza passare da esc()', () => {
  /* Una interpolazione diretta di un campo utente dentro innerHTML. */
  const c = cerca(/innerHTML\s*=\s*[^;]*\+\s*(u|utente|user|s|sessione)\.(nome|email|labName)\b/);
  assert.deepEqual(c, []);
});

/* ── Superficie ─────────────────────────────────────────────────────────── */

test('nessun eval, nessun Function costruito da stringa, nel prodotto', () => {
  const c = cerca(/\beval\s*\(|new\s+Function\s*\(/, (f) => f.startsWith('product/'));
  assert.deepEqual(c, []);
});

test('nessun URL esterno di autenticazione scritto a mano nei moduli nuovi', () => {
  const nuovi = ['product/account-service.js', 'product/device-sessions.js',
    'product/auth-guard.js', 'product/billing.js', 'product/sicurezza-view.js'];
  const c = cerca(/https?:\/\//, (f) => nuovi.includes(f));
  assert.deepEqual(c, [], 'un indirizzo scritto nel codice è un indirizzo che nessuno aggiorna');
});

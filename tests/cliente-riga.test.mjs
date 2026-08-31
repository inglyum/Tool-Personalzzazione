/**
 * cliente-riga.test.mjs — CRM-05: una funzione sola disegna la riga.
 *
 * Le regole che la direttiva pone sono tre, e sono verificabili come tali:
 * il renderer non recupera dati, non crea id, e tutto quel che scrive passa
 * da `esc()`. Qui si provano una per una, più quel che il consolidamento
 * doveva rimettere in piedi: i tag, che erano spariti.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../src/product/cliente-riga.js', import.meta.url), 'utf8');

function carica(extra = {}) {
  const ctx = vm.createContext(Object.assign({ console }, extra));
  vm.runInContext(src, ctx);
  return ctx.InglyClienteRiga;
}

test('il renderer non tocca né localStorage né il database', () => {
  /* Non è una promessa nel commento: il modulo viene eseguito in un contesto
     dove `localStorage`, `IDB` e `fetch` non esistono. Se li usasse, la
     costruzione di una riga lancerebbe. */
  const R = carica();
  const html = R.riga({ id: '7', name: 'Rossi', phone: '3331234567' });
  assert.match(html, /Rossi/);
  assert.ok(!/localStorage|IDB|indexedDB/.test(src.split('/*')[0] + html));
});

test('il sorgente non nomina nessuna sorgente di dati', () => {
  /* Il commento di intestazione le cita per spiegare il difetto: si guarda
     il codice, non la prosa. */
  const codice = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const proibito of ['localStorage', 'indexedDB', 'IDB', 'fetch(', '_load(']) {
    assert.ok(!codice.includes(proibito), 'il renderer recupera dati: ' + proibito);
  }
});

test('non inventa un id, e disattiva i comandi di chi non ce l’ha', () => {
  const R = carica();
  const html = R.riga({ name: 'Senza identificativo' });
  assert.ok(!/id="crm-row-/.test(html), 'ha inventato un id di riga');
  assert.ok(!/_deleteClient|_editClient/.test(html), 'ha lasciato comandi su un record non identificato');
  assert.match(html, /senza identificativo/i);
});

test('un id nullo non diventa la stringa «null» né la posizione', () => {
  const R = carica();
  for (const c of [{ id: null, name: 'A' }, { id: '', name: 'B' }, { id: undefined, name: 'C' }]) {
    const html = R.riga(c);
    assert.ok(!/crm-row-(null|undefined|0)/.test(html));
  }
});

test('nome, azienda, note e tag passano da esc()', () => {
  const R = carica();
  const html = R.riga({
    id: '1', name: '<script>alert(1)</script>', company: 'Rossi & Figli',
    notes: '"virgolette"', tags: ['<b>tag</b>'],
  });
  assert.ok(!html.includes('<script>'), 'il nome è finito nel markup senza escape');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Rossi &amp; Figli/);
  assert.ok(!html.includes('<b>tag</b>'));
});

test('i tag sono dentro la riga, non appesi dopo', () => {
  /* Il difetto misurato: la patch 082 li appendeva 200 ms dopo cercando
     `#crm-row-<indice>`, e da CRM-04 le righe hanno l'id del cliente. */
  const R = carica();
  const html = R.riga({ id: '9', name: 'Bianchi', tags: 'VIP, Ricorrente' },
    { presetTag: [{ label: 'VIP', color: '#f59e0b' }] });
  assert.match(html, /VIP/);
  assert.match(html, /Ricorrente/);
  assert.match(html, /#f59e0b/, 'il colore del preset non è stato usato');
  assert.match(html, /crm-row-tags/);
});

test('i tag arrivano sia come stringa sia come elenco', () => {
  const R = carica();
  const a = R.riga({ id: '1', name: 'X', tags: 'uno, due' });
  const b = R.riga({ id: '1', name: 'X', tags: ['uno', 'due'] });
  assert.equal(a, b);
});

test('le tre grafie dei campi convergono su una sola', () => {
  const R = carica();
  const c = R.campi({ ragione_sociale: 'ACME S.r.l.', tel: '0912345', mail: 'a@b.it' });
  assert.equal(c.nome, 'ACME S.r.l.');
  assert.equal(c.telefono, '0912345');
  assert.equal(c.email, 'a@b.it');
});

test('un cliente archiviato lo dichiara', () => {
  const R = carica();
  const html = R.riga({ id: '3', name: 'Verdi', status: 'ARCHIVED' });
  assert.match(html, /ARCHIVIATO/);
});

test('la riga porta l’id del cliente, mai la sua posizione', () => {
  const R = carica();
  const html = R.righe([{ id: 'c-42', name: 'A' }, { id: 'c-7', name: 'B' }]);
  assert.match(html, /id="crm-row-c-42"/);
  assert.match(html, /id="crm-row-c-7"/);
  assert.ok(!/id="crm-row-0"/.test(html));
});

test('un elenco vuoto lo dice invece di sparire', () => {
  const R = carica();
  const html = R.righe([]);
  assert.match(html, /Nessun cliente/);
  assert.match(html, /colspan="6"/);
});

test('le azioni registrate entrano nella riga alla prima costruzione', () => {
  const R = carica();
  R.aggiungiAzione({ id: 'prova', icona: '🔔', titolo: 'Prova', comando: (c) => "Q.open('" + c.id + "')" });
  const html = R.riga({ id: '5', name: 'A' });
  assert.match(html, /🔔/);
  assert.match(html, /Q\.open\(&#39;5&#39;\)/);
});

test('`prepara` viene chiamato una volta per tabella, non una per riga', () => {
  /* Era il difetto di misura del pulsante «archivio»: rileggeva e ri-parsava
     tutti i preventivi una volta per ogni riga. */
  const R = carica();
  let chiamate = 0;
  R.aggiungiAzione({
    id: 'conta', prepara: () => { chiamate++; return { n: 1 }; },
    icona: '📂', comando: () => 'x',
  });
  R.righe([{ id: '1', name: 'A' }, { id: '2', name: 'B' }, { id: '3', name: 'C' }]);
  assert.equal(chiamate, 1);
});

test('un’aggiunta che lancia non porta giù la tabella', () => {
  const R = carica();
  R.aggiungiAzione({ id: 'rotta', prepara: () => { throw new Error('boom'); }, icona: '💥', comando: () => 'x' });
  const html = R.righe([{ id: '1', name: 'Sopravvive' }]);
  assert.match(html, /Sopravvive/);
});

test('registrare due volte lo stesso id sostituisce, non duplica', () => {
  const R = carica();
  R.aggiungiAzione({ id: 'u', icona: '1️⃣', comando: () => 'a' });
  R.aggiungiAzione({ id: 'u', icona: '2️⃣', comando: () => 'a' });
  const html = R.riga({ id: '1', name: 'A' });
  assert.equal(html.split('2️⃣').length - 1, 1);
  assert.ok(!html.includes('1️⃣'));
});

test('chi non vuole le aggiunte non le riceve', () => {
  const R = carica();
  R.aggiungiAzione({ id: 'x', icona: '🔔', comando: () => 'a' });
  const html = R.riga({ id: '1', name: 'A' }, { senzaAggiunte: true });
  assert.ok(!html.includes('🔔'));
});

test('le colonne libere non sono un buco nell’escape', () => {
  const R = carica();
  const html = R.riga({ id: '1', name: 'A' },
    { colonne: [{ valore: () => '<img src=x onerror=1>' }] });
  assert.ok(!html.includes('<img'));
  const consapevole = R.riga({ id: '1', name: 'A' },
    { colonne: [{ html: true, valore: () => '<b>ok</b>' }] });
  assert.match(consapevole, /<b>ok<\/b>/);
});

test('lo stesso cliente dà sempre la stessa riga', () => {
  const R = carica();
  const c = { id: '1', name: 'A', phone: '333', tags: ['t'] };
  assert.equal(R.riga(c), R.riga(c));
});

/**
 * politiche-prezzo.test.mjs — i margini si possono raggiungere, e un prodotto
 * può dichiarare il suo.
 *
 * Due difetti misurati, diversi fra loro:
 *
 *   1. Le sette politiche di prezzo esistono nel motore da prima di questo
 *      lavoro, e `InglyPricingPolicies` ha sempre avuto `imposta()` e
 *      `ripristina()`. Non le chiamava nessuno: `grep` trovava un solo
 *      consumatore in tutta l'applicazione, e nessuna schermata. Un margine
 *      che il programma sa usare e che l'utente non può cambiare vale quanto
 *      un margine che non c'è.
 *
 *   2. Il ricalcolo del listino applicava **un margine solo a tutti**: un
 *      portachiavi da tre euro e un pezzo su commissione uscivano con la
 *      stessa percentuale, e distinguerli voleva dire lanciare il ricalcolo
 *      due volte filtrando a mano.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/catalog-recalc.js', 'utf8'), sandbox);
const E = sandbox.window.InglyCostEngine;
const R = sandbox.window.InglyCatalogRicalcolo;
const POLITICHE = E.politiche({});

/* ── La politica del singolo prodotto ────────────────────────────────────── */

test('il modulo espone la lettura della politica', () => {
  assert.equal(typeof R.politicaDi, 'function');
  assert.equal(typeof R.margineDi, 'function');
});

test('un prodotto senza politica usa il margine generale', () => {
  const m = R.margineDi({ name: 'x' }, 45, POLITICHE);
  assert.equal(m.pct, 45);
  assert.equal(m.politica, null);
  assert.equal(m.fonte, 'generale');
});

test('un prodotto che dichiara la sua politica usa quel margine', () => {
  const m = R.margineDi({ pricingPolicyId: 'premium' }, 45, POLITICHE);
  assert.equal(m.pct, 60);
  assert.equal(m.fonte, 'prodotto');
});

test('cost_profile_id vale come sinonimo', () => {
  /* È il nome con cui la richiesta è arrivata: un dato già scritto così non
     deve diventare invisibile per una questione di etichetta. */
  assert.equal(R.margineDi({ cost_profile_id: 'wholesale' }, 45, POLITICHE).pct, 20);
  assert.equal(R.margineDi({ costProfileId: 'wholesale' }, 45, POLITICHE).pct, 20);
  assert.equal(R.margineDi({ politicaPrezzo: 'wholesale' }, 45, POLITICHE).pct, 20);
});

test('una politica dichiarata e non trovata non si sostituisce in silenzio', () => {
  const m = R.margineDi({ pricingPolicyId: 'inesistente' }, 45, POLITICHE);
  assert.equal(m.pct, 45, 'deve comunque calcolare');
  assert.equal(m.fonte, 'sconosciuta', 'e deve dire che quella dichiarata non esiste');
  assert.equal(m.politica, 'inesistente');
});

test('un campo vuoto non conta come dichiarazione', () => {
  assert.equal(R.margineDi({ pricingPolicyId: '' }, 45, POLITICHE).fonte, 'generale');
  assert.equal(R.margineDi({ pricingPolicyId: '   ' }, 45, POLITICHE).fonte, 'generale');
  assert.equal(R.margineDi({ pricingPolicyId: null }, 45, POLITICHE).fonte, 'generale');
});

/* ── La proposta di ricalcolo ────────────────────────────────────────────── */

const PRODOTTI = [
  { id: 1, name: 'Generale', costPrice: 10, salePrice: 0 },
  { id: 2, name: 'Premium', costPrice: 10, salePrice: 0, pricingPolicyId: 'premium' },
  { id: 3, name: 'Ingrosso', costPrice: 10, salePrice: 0, cost_profile_id: 'wholesale' },
];

test('ogni riga porta il margine che ha usato e da dove viene', () => {
  const p = R.proposta(PRODOTTI, { marginePct: 45, arrotondamento: 'nessuno', politiche: POLITICHE });
  assert.equal(p.righe.length, 3);
  assert.deepEqual(p.righe.map((r) => r.marginePctUsata), [45, 60, 20]);
  assert.deepEqual(p.righe.map((r) => r.fontePolitica), ['generale', 'prodotto', 'prodotto']);
});

test('e i prezzi proposti sono diversi fra loro, non tutti sullo stesso margine', () => {
  const p = R.proposta(PRODOTTI, { marginePct: 45, arrotondamento: 'nessuno', politiche: POLITICHE });
  const prezzi = p.righe.map((r) => r.prezzoNuovo);
  assert.equal(new Set(prezzi).size, 3, 'tre politiche diverse devono dare tre prezzi diversi: ' + prezzi);
  /* 10 € di costo al 60% di margine fa 25 €, al 20% fa 12,50 €. */
  assert.ok(Math.abs(prezzi[1] - 25) < 0.01, prezzi[1]);
  assert.ok(Math.abs(prezzi[2] - 12.5) < 0.01, prezzi[2]);
});

test('senza politiche passate si torna al comportamento di prima', () => {
  /* Chi chiama senza l'elenco non deve ottenere prezzi diversi da ieri. */
  const p = R.proposta(PRODOTTI, { marginePct: 45, arrotondamento: 'nessuno' });
  assert.deepEqual(p.righe.map((r) => r.marginePctUsata), [45, 45, 45]);
  assert.equal(new Set(p.righe.map((r) => r.prezzoNuovo)).size, 1);
});

test('un prodotto senza costo resta non calcolabile, politica o no', () => {
  const p = R.proposta([{ id: 9, name: 'senza costo', costPrice: 0, pricingPolicyId: 'premium' }],
    { marginePct: 45, politiche: POLITICHE });
  assert.equal(p.righe[0].calcolabile, false);
  assert.ok(/nessun costo/.test(p.righe[0].motivo));
});

test('il modulo di ricalcolo resta puro', () => {
  /* Le politiche arrivano da chi chiama proprio per questo: se le leggesse da
     sé, questo file leggerebbe localStorage e i ricalcoli smetterebbero di
     essere riproducibili. */
  /* Si guarda il codice, non i commenti: la prima versione di questo controllo
     falliva sul commento che spiega perché il controllo esiste. */
  const t = fs.readFileSync('src/product/catalog-recalc.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.ok(!/localStorage/.test(t), 'catalog-recalc legge localStorage');
  assert.ok(!/InglyPricingPolicies/.test(t), 'catalog-recalc va a prendersi le politiche da sé');
});

/* ── La schermata che mancava ────────────────────────────────────────────── */

const vista = fs.readFileSync('src/product/cost-profiles-view.js', 'utf8');

test('il pannello ha la scheda dei margini', () => {
  assert.ok(/\['politiche', '💰 Margini'/.test(vista));
  assert.ok(/function sezionePolitiche\(\)/.test(vista));
});

test('e i tre campi di ogni politica sono modificabili', () => {
  for (const c of ['marginTarget', 'maxDiscount', 'floorMargin']) {
    assert.ok(vista.includes("campo('politiche.' + i + '." + c + "'"), 'manca il campo ' + c);
  }
});

test('il pannello distingue quello che costa da quello che si guadagna', () => {
  /* È la prima volta che questo pannello parla di prezzo, e confondere le due
     cose è il modo in cui un laboratorio scopre a fine anno di aver lavorato
     in perdita credendo di avere il 40%. */
  assert.ok(/costa<\/b>/.test(vista) && /guadagnare<\/b>/.test(vista),
    'l\'intestazione non distingue costo e margine');
});

test('salvare non congela un valore identico al predefinito', () => {
  /* Conservarlo lo bloccherebbe: il giorno in cui il motore cambia i suoi,
     questo laboratorio resterebbe fermo ai vecchi senza saperlo. */
  const f = vista.match(/function salvaPolitiche\(\)[\s\S]*?\n  \}/);
  assert.ok(f, 'salvaPolitiche non trovata');
  assert.ok(/uguale/.test(f[0]) && /ripristina/.test(f[0]),
    'salvaPolitiche riscrive anche i valori non toccati');
});

test('il pavimento resta al motore', () => {
  const f = vista.match(/function salvaPolitiche\(\)[\s\S]*?\n  \}/)[0];
  assert.ok(!/MARGINE_MINIMO|Math\.max\(10/.test(f),
    'la regola del margine minimo è stata copiata nella vista');
});

/* ── Il catalogo ─────────────────────────────────────────────────────────── */

const catalogo = fs.readFileSync('src/legacy/app/src/modules/catalog/index.js', 'utf8');
const markup = fs.readFileSync('src/legacy/markup/005.html', 'utf8');

test('la scheda prodotto ha il campo della politica', () => {
  assert.ok(markup.includes('id="cat-politica"'));
  assert.ok(/popolaPolitiche\(/.test(catalogo));
});

test('il campo si salva col prodotto', () => {
  assert.ok(/pricingPolicyId:document\.getElementById\('cat-politica'\)/.test(catalogo));
});

test('e si ripopola leggendo il prodotto, non prima', () => {
  /* Popolare la tendina su un record non ancora letto la lascerebbe sempre
     sul generale — ed era il primo modo in cui l'avevo scritta. */
  const i = catalogo.indexOf('const _p2=_id2?(await IDB.get');
  const j = catalogo.indexOf('this.popolaPolitiche(_p2');
  assert.ok(i > 0 && j > i, 'la tendina si popola prima di aver letto il prodotto');
});

test('il ricalcolo passa le politiche al modulo puro', () => {
  assert.ok(/R\.proposta\(st\.prodotti, \{ marginePct: st\.marginePct, arrotondamento: st\.arrotondamento, politiche \}\)/.test(catalogo));
});

test('e la tabella mostra quale politica ha usato ogni riga', () => {
  assert.ok(/fontePolitica === 'prodotto'/.test(catalogo));
  assert.ok(/sconosciuta/.test(catalogo), 'una politica non riconosciuta non viene segnalata');
  assert.ok(/>Politica<\/th>/.test(catalogo), 'manca la colonna');
});

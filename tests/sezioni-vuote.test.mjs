/**
 * sezioni-vuote.test.mjs — una voce di menù deve portare da qualche parte.
 *
 * Misurato aprendo l'applicazione in un browser, una sezione per volta:
 *
 *   weeklyreport  vista attiva, 0 caratteri — il modulo esiste ed è completo,
 *                 ma è un `const` mai esportato: la rotta lo cerca da un altro
 *                 blocco di script, trova «undefined» e non disegna niente.
 *   revsim        vista attiva, 0 caratteri — `RevSim` non è definito in
 *                 nessun file sorgente. La funzione non è mai esistita.
 *   bu, team      una griglia vuota sotto l'intestazione. Qui la prima
 *                 diagnosi era sbagliata, e vale la pena scriverlo: sembravano
 *                 moduli mancanti perché `window.BU` è undefined, ma `BU` è un
 *                 `const` globale — il modulo c'è, è completo, e disegnava il
 *                 vuoto perché l'archivio era vuoto. Sostituirlo con un
 *                 cartello «non disponibile» sarebbe stato peggio del difetto.
 *
 * Qui si verifica che quei casi non possano tornare in silenzio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

/* ── Il modulo che dice la verità ────────────────────────────────────────── */

function sandboxConDom(vista) {
  const nodi = {};
  const doc = { getElementById: (id) => nodi[id] || null };
  const sandbox = { window: {}, document: doc, console };
  sandbox.globalThis = sandbox;
  if (vista) nodi['view-' + vista] = { innerHTML: '' };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('src/product/sezione-incompleta.js', 'utf8'), sandbox);
  sandbox.window.document = doc;
  return { sandbox, nodi, S: sandbox.window.InglySezioneIncompleta };
}

test('il modulo si espone', () => {
  const { S } = sandboxConDom();
  assert.ok(S);
  assert.equal(typeof S.mostra, 'function');
});

test('dichiara solo le sezioni che davvero non hanno un modulo', () => {
  const { S } = sandboxConDom();
  assert.ok(S.dichiarata('revsim'), 'revsim non è dichiarata');
  /* Il confine che questo controllo protegge: `bu` e `team` hanno un modulo
     completo. Rimetterli qui li nasconderebbe dietro un cartello. */
  assert.equal(S.dichiarata('bu'), false, 'bu ha un modulo: il pannello lo coprirebbe');
  assert.equal(S.dichiarata('team'), false, 'team ha un modulo: il pannello lo coprirebbe');
});

test('ogni sezione dice a cosa servirebbe, perché non c\'è, e cosa usare adesso', () => {
  const { S } = sandboxConDom();
  for (const [id, s] of Object.entries(S.SEZIONI)) {
    assert.ok(s.titolo && s.titolo.length > 3, id + ': manca il titolo');
    assert.ok(s.cosaFarebbe && s.cosaFarebbe.length > 40, id + ': non dice a cosa servirebbe');
    assert.ok(s.perche && s.perche.length > 30, id + ': non dice perché non c\'è');
    assert.ok(Array.isArray(s.invece) && s.invece.length >= 2,
      id + ': senza un\'alternativa reale questo pannello è solo una scusa');
    for (const v of s.invece) {
      assert.ok(v.sezione && v.label && v.spiega, id + ': alternativa incompleta');
    }
  }
});

test('disegna dentro la vista della sezione', () => {
  const { S, nodi } = sandboxConDom('revsim');
  assert.equal(S.mostra('revsim'), true);
  const html = nodi['view-revsim'].innerHTML;
  assert.ok(html.length > 200);
  assert.ok(/Revenue Simulator/.test(html));
  assert.ok(/Non ancora disponibile/i.test(html));
  assert.ok(/Financial Forecaster/.test(html));
});

test('il pannello riscrive la vista, comandi morti compresi', () => {
  const { S, nodi } = sandboxConDom('revsim');
  nodi['view-revsim'].innerHTML = '<button onclick="RevSim.qualcosa()">morto</button>';
  S.mostra('revsim');
  assert.ok(!/RevSim\.qualcosa/.test(nodi['view-revsim'].innerHTML));
});

test('il modulo vero, quando ci sarà, vince', () => {
  const { S, sandbox, nodi } = sandboxConDom('revsim');
  sandbox.window.RevSim = { render() {} };
  assert.equal(S.moduloPresente('revsim'), true);
  assert.equal(S.mostra('revsim'), false, 'il pannello si è sovrapposto a un modulo funzionante');
  assert.equal(nodi['view-revsim'].innerHTML, '');
});

test('una sezione non dichiarata non viene toccata', () => {
  const { S } = sandboxConDom('quoter');
  assert.equal(S.mostra('quoter'), false);
});

test('una vista assente non fa esplodere niente', () => {
  const { S } = sandboxConDom();
  assert.equal(S.mostra('revsim'), false);
});

test('il testo passa da esc()', () => {
  const { S, nodi } = sandboxConDom('revsim');
  S.SEZIONI.revsim.titolo = '<img src=x onerror=alert(1)>';
  S.mostra('revsim');
  assert.ok(!/<img/.test(nodi['view-revsim'].innerHTML));
  assert.ok(/&lt;img/.test(nodi['view-revsim'].innerHTML));
});

/* ── Le rotte ────────────────────────────────────────────────────────────── */

const app = fs.readFileSync('src/legacy/app/src/core/app.js', 'utf8');

test('la rotta senza modulo passa dal pannello', () => {
  assert.ok(app.includes("revsim:()=>_sezione('revsim'"), 'la rotta revsim non passa da _sezione()');
});

test('le rotte con un modulo vero lo chiamano e basta', () => {
  assert.ok(app.includes("bu:()=>{if(typeof BU!=='undefined')BU.render();}"),
    'la rotta bu passa da un pannello che coprirebbe il suo modulo');
  assert.ok(app.includes("team:()=>{if(typeof Team!=='undefined')Team.render();}"),
    'la rotta team passa da un pannello che coprirebbe il suo modulo');
});

test('sei rotte non aspettano più un momento di quiete che può non arrivare', () => {
  /* `requestIdleCallback(fn)` senza scadenza vuol dire «quando capita». Su
     weeklyreport voleva dire mai: il modulo produce 1617 caratteri se chiamato
     a mano, zero passando dalla rotta. */
  for (const s of ['weeklyreport', 'pdfmonth', 'kpi', 'intel', 'forecasting', 'contentcalendar']) {
    const riga = app.split('\n').find((r) => r.trim().startsWith(s + ':'));
    assert.ok(riga, 'rotta ' + s + ' non trovata');
    assert.ok(!/requestIdleCallback/.test(riga),
      'la rotta ' + s + ' rinvia ancora senza scadenza: ' + riga.trim());
  }
});

test('_appenaPossibile dichiara la sua scadenza e non fa il lavoro due volte', () => {
  const f = app.match(/function _appenaPossibile\([\s\S]*?\n\}/);
  assert.ok(f, '_appenaPossibile non trovata');
  assert.ok(/timeout: ms/.test(f[0]), 'la scadenza non viene passata a requestIdleCallback');
  assert.ok(/setTimeout\(una, ms/.test(f[0]), 'manca la rete di sicurezza');
  assert.ok(/if\(fatto\) return;/.test(f[0]), 'il disegno potrebbe partire due volte');
});

test('_sezione prova prima il modulo vero', () => {
  const f = app.match(/function _sezione\([\s\S]*?\n\}/);
  assert.ok(f, '_sezione non trovata');
  assert.ok(f[0].indexOf('disegna()') < f[0].indexOf('InglySezioneIncompleta'),
    'il pannello viene disegnato prima di provare il modulo');
});

test('_sezione non lascia esplodere un modulo che sbaglia', () => {
  const f = app.match(/function _sezione\([\s\S]*?\n\}/)[0];
  assert.ok(/try\s*\{\s*disegna\(\)/.test(f),
    'un errore del modulo porterebbe giù la navigazione');
});

/* ── I moduli che c'erano e non si vedevano ──────────────────────────────── */

const settings = fs.readFileSync('src/legacy/app/src/modules/settings/index.js', 'utf8');

test('WeeklyReport è esportato: esisteva, funzionava, ed era irraggiungibile', () => {
  assert.ok(/const WeeklyReport = \{/.test(settings), 'il modulo non c\'è più');
  assert.ok(/window\.WeeklyReport = WeeklyReport;/.test(settings),
    'il modulo è scritto ma la navigazione non lo può vedere');
});

test('e il file lo esporta dopo averlo definito', () => {
  assert.ok(settings.indexOf('const WeeklyReport = {') < settings.indexOf('window.WeeklyReport = WeeklyReport;'));
});

/* ── Il registro della build ─────────────────────────────────────────────── */

test('il modulo entra nella build', () => {
  const idx = fs.readFileSync('src/product/index.mjs', 'utf8');
  assert.ok(/'sezione-incompleta\.js'/.test(idx), 'non verrebbe mai caricato');
});

test('BU e Team spiegano l\'archivio vuoto invece di mostrare una griglia muta', () => {
  for (const [modulo, atteso] of [['BU', /nessuna business unit/i], ['Team', /nessuna persona/i]]) {
    const m = settings.match(new RegExp('const ' + modulo + '=\\{[\\s\\S]*?\\n  async render\\(\\)\\{[\\s\\S]*?\\n  \\},'));
    assert.ok(m, modulo + '.render non trovata');
    assert.ok(/_vuoto\(/.test(m[0]), modulo + ': la griglia vuota non dice niente');
    assert.ok(atteso.test(m[0]), modulo + ': il messaggio non spiega cosa manca');
  }
});

test('lo stato vuoto porta con sé il comando che lo riempie', () => {
  assert.ok(/_vuoto\('Nessuna business unit registrata'[\s\S]{0,600}BU\.openModal\(\)/.test(settings));
  assert.ok(/_vuoto\('Nessuna persona registrata'[\s\S]{0,600}Team\.openModal\(\)/.test(settings));
});

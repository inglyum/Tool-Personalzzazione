/**
 * production-model.test.mjs — con che cosa è stato fatto, davvero.
 *
 * L'audit ha misurato `primaryTechnology` e `technologies` a zero occorrenze:
 * il programma sapeva leggere **una** tecnologia per ordine e non aveva un
 * posto dove scrivere «laser più UV» — che è metà del lavoro di un laboratorio
 * vero, perché si taglia al laser e si stampa sopra.
 *
 * Il test che conta più di tutti è l'ultimo blocco: un ordine misto da 150 €
 * non vale 150 di laser **e** 150 di UV. Vale 150.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-snapshot.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-fields.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/production-model.js', 'utf8'), sandbox);
const P = sandbox.window.InglyProduction;

/* Gli array nascono dentro il sandbox `vm` e hanno un `Array.prototype`
   diverso da quello di questo file: `assert.deepEqual` li dichiara diversi pur
   avendo lo stesso contenuto. Si confronta il contenuto, che è la cosa che
   interessa davvero. */
const uguali = (a, b, msg) => assert.equal(Array.from(a || []).join('|'), b.join('|'), msg);

test('il modulo si espone con le otto tecnologie', () => {
  assert.ok(P);
  const id = P.elenco().map((t) => t.id);
  ['laser', '3d', 'uv', 'dtf', 'tessile', 'manuale', 'finitura', 'altro']
    .forEach((t) => assert.ok(id.includes(t), 'manca ' + t));
});

/* ── Normalizzazione: i nomi che i dati usano già ───────────────────────── */

test('i nomi storici si riconoscono', () => {
  assert.equal(P.normalizza('print3d'), '3d');
  assert.equal(P.normalizza('stampa3d'), '3d');
  assert.equal(P.normalizza('FDM'), '3d');
  assert.equal(P.normalizza('resina'), '3d');
  assert.equal(P.normalizza('incisione'), 'laser');
  assert.equal(P.normalizza('CO2'), 'laser');
  assert.equal(P.normalizza('sublimazione'), 'tessile');
  assert.equal(P.normalizza('stampa UV'), 'uv');
});

test('un nome che non si riconosce resta null, non diventa «altro»', () => {
  /* Trasformarlo in «altro» perderebbe l'informazione che il dato c'era e non
     si è capito: sono due situazioni diverse. */
  assert.equal(P.normalizza('pantografo'), null);
  assert.equal(P.normalizza(''), null);
  assert.equal(P.normalizza(null), null);
});

/* ── Costruzione ────────────────────────────────────────────────────────── */

test('una sola tecnologia non è un misto', () => {
  const p = P.costruisci(['laser']);
  assert.equal(p.primaryTechnology, 'laser');
  uguali(p.technologies, ['laser']);
  assert.equal(p.isMixed, false);
});

test('due tecnologie sì', () => {
  const p = P.costruisci(['laser', 'uv']);
  assert.equal(p.primaryTechnology, 'laser');
  uguali(p.technologies, ['laser', 'uv']);
  assert.equal(p.isMixed, true);
});

test('i doppioni non contano due volte', () => {
  const p = P.costruisci(['laser', 'Laser', 'incisione', 'uv']);
  uguali(p.technologies, ['laser', 'uv']);
  assert.equal(p.isMixed, true);
});

test('le operazioni portano tecnologie che l elenco non aveva', () => {
  /* Quello che si è fatto davvero conta più di quello che si era detto. */
  const p = P.costruisci(['laser'], [{ type: 'laser', sequence: 1 }, { type: 'finitura', sequence: 2 }]);
  uguali(p.technologies, ['laser', 'finitura']);
  assert.equal(p.isMixed, true);
  assert.equal(p.operations.length, 2);
});

/* ── Lettura, e il ripiego per i record legacy ──────────────────────────── */

test('un ordine col modello si legge dal modello', () => {
  const p = P.leggi({ production: { primaryTechnology: 'uv', technologies: ['laser', 'uv'] } });
  assert.equal(p.primaryTechnology, 'uv', 'la primaria dichiarata vince');
  uguali(p.technologies, ['laser', 'uv']);
  assert.equal(p.dedotta, false);
});

test('un ordine legacy si legge dai campi storici, e lo dichiara', () => {
  const p = P.leggi({ technology: 'laser', name: 'Ordine vecchio' });
  assert.equal(p.primaryTechnology, 'laser');
  assert.equal(p.dedotta, true, 'chi mostra il dato deve sapere che è una deduzione');
  assert.equal(p.fonte, 'campi storici');
});

test('e una deduzione da un campo solo non è mai un misto', () => {
  /* Dichiararlo misto sarebbe inventare una seconda lavorazione. */
  assert.equal(P.leggi({ technology: 'laser' }).isMixed, false);
});

test('si legge anche dalle righe dell ordine', () => {
  const p = P.leggi({ lines: [{ desc: 'Targa', tech: 'uv' }] });
  assert.equal(p.primaryTechnology, 'uv');
  assert.equal(p.dedotta, true);
});

test('un ordine che non dice niente non inventa niente', () => {
  const p = P.leggi({ name: 'Ordine muto' });
  assert.equal(p.primaryTechnology, null);
  uguali(p.technologies, []);
  assert.match(p.motivo, /nessuna tecnologia dichiarata/);
});

test('la categoria prodotto non viene scambiata per tecnologia', () => {
  /* È il punto della Fase 5: `category` dice che cosa è il prodotto, non come
     è stato fatto. Un portachiavi può essere laser, UV o 3D. */
  const p = P.leggi({ category: 'laser', name: 'Portachiavi' });
  assert.equal(p.primaryTechnology, null, 'category non deve diventare tecnologia');
});

/* ── Classificazione ed etichetta ───────────────────────────────────────── */

test('un misto si classifica «misto», una volta sola', () => {
  const c = P.classifica({ production: { technologies: ['laser', 'uv'] } });
  assert.equal(c.id, 'misto');
  assert.equal(c.isMixed, true);
  uguali(c.technologies, ['laser', 'uv']);
});

test("l'etichetta di un misto nomina tutte le tecnologie", () => {
  const e = P.etichetta({ production: { technologies: ['laser', 'uv'] } });
  assert.match(e, /Laser/);
  assert.match(e, /UV/);
  assert.match(e, /\+/);
});

test('e quella di un ordine muto dice che non è dichiarata', () => {
  assert.match(P.etichetta({}), /Non dichiarata/);
});

/* ── LA REGOLA CHE IMPEDISCE IL DOPPIO CONTEGGIO ───────────────────────────
   Il punto della Fase 12, e il difetto più costoso che si potrebbe
   introdurre: un ordine misto contato in ogni tecnologia raddoppia il
   fatturato dell'azienda in un grafico. */

test('un ordine misto da 150 vale 150, non 300', () => {
  const q = P.quotaPerTecnologia({ production: { technologies: ['laser', 'uv'] } }, 150);
  assert.equal(q.righe.length, 1, 'una riga sola: niente duplicazione');
  assert.equal(q.righe[0].tecnologia, 'misto');
  assert.equal(q.righe[0].importo, 150);
  assert.equal(q.righe.reduce((a, r) => a + r.importo, 0), 150);
});

test('e si dice perché non è ripartito', () => {
  const q = P.quotaPerTecnologia({ production: { technologies: ['laser', 'uv'] } }, 150);
  assert.equal(q.ripartito, false);
  assert.match(q.motivo, /attribuzione economica per singola lavorazione/);
});

test('un ordine a tecnologia sola va nella sua tecnologia', () => {
  const q = P.quotaPerTecnologia({ production: { technologies: ['laser'] } }, 150);
  assert.equal(q.righe[0].tecnologia, 'laser');
  assert.equal(q.righe[0].importo, 150);
  assert.equal(q.motivo, null);
});

test('la somma delle quote è sempre l importo di partenza', () => {
  for (const rec of [
    { production: { technologies: ['laser'] } },
    { production: { technologies: ['laser', 'uv'] } },
    { production: { technologies: ['laser', 'uv', '3d'] } },
    { technology: '3d' },
    {},
  ]) {
    const q = P.quotaPerTecnologia(rec, 150);
    assert.equal(q.righe.reduce((a, r) => a + r.importo, 0), 150,
      'somma diversa dall importo su ' + JSON.stringify(rec));
  }
});

/* ── Filtri ─────────────────────────────────────────────────────────────── */

test('il filtro per tecnologia prende anche i misti che la contengono', () => {
  const misto = { production: { technologies: ['laser', 'uv'] } };
  assert.equal(P.passa(misto, 'laser'), true);
  assert.equal(P.passa(misto, 'uv'), true);
  assert.equal(P.passa(misto, '3d'), false);
});

test('il filtro «misti» prende solo i misti', () => {
  assert.equal(P.passa({ production: { technologies: ['laser', 'uv'] } }, 'misto'), true);
  assert.equal(P.passa({ production: { technologies: ['laser'] } }, 'misto'), false);
});

test('«tutti» passa tutto, anche i muti', () => {
  assert.equal(P.passa({}, 'tutti'), true);
  assert.equal(P.passa({}, null), true);
});

test('i filtri si costruiscono da quello che c è davvero', () => {
  /* Un filtro che offre «DTF» quando nessun ordine è in DTF fa perdere tempo. */
  const voci = P.filtriDisponibili([
    { production: { technologies: ['laser'] } },
    { production: { technologies: ['laser', 'uv'] } },
    { name: 'muto' },
  ]);
  const id = voci.map((v) => v.id);
  assert.ok(id.includes('laser'));
  assert.ok(id.includes('uv'));
  assert.ok(id.includes('misto'));
  assert.ok(id.includes('sconosciuta'));
  assert.ok(!id.includes('dtf'), 'nessun ordine è in DTF: il filtro non deve offrirlo');
  assert.equal(voci.find((v) => v.id === 'laser').n, 2, 'il laser compare in due ordini');
});

test('un elenco vuoto dà solo «tutti»', () => {
  uguali(P.filtriDisponibili([]).map((v) => v.id), ['tutti']);
});

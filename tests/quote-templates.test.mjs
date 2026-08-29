/**
 * quote-templates.test.mjs — il giro deve chiudersi.
 *
 * Un template conservava righe, ricarico e sconto. Ricaricandolo, l'IVA
 * tornava al predefinito, la spedizione spariva, le commissioni di canale pure
 * e la politica di prezzo non c'era mai stata: si otteneva un preventivo che
 * **somiglia** a quello di prima, e la differenza si vedeva solo nel totale.
 *
 * La prova centrale è una sola: quello che entra deve uscire identico.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/quote-templates.js', 'utf8'), contesto);
const T = contesto.InglyQuoteTemplates;

/** Uno stato di preventivo completo: righe e tutti i campi economici. */
const STATO = {
  lines: [
    { id: 1, name: 'Targa incisa', cat: 'laser', catLabel: 'Laser', detail: '12 min', unit: 'pz', qty: 30, unitCost: 2.4, subtotal: 72, itemId: 7, itemStore: 'items', itemKey: 'items:7' },
    { id: 2, name: 'MDF 3mm', cat: 'materiale', catLabel: 'Materiale', detail: '', unit: 'fogli', qty: 6, unitCost: 1.8, subtotal: 10.8, itemKey: 'items:3', itemId: 3, itemStore: 'items' },
    { id: 3, name: 'Montaggio', cat: 'manodopera', catLabel: 'Manodopera', detail: '40 min', unit: 'min', qty: 40, unitCost: 0.3, subtotal: 12 },
  ],
  strategia: 'ricarico', markup: 1.6, markupPct: 160,
  discountPct: 8, vatPct: 22, setupCost: 25, failureRate: 5,
  overheadPerHour: 6, hours: 2.5,
  paymentFeePct: 1.9, paymentFeeFixed: 0.30, marketplaceFeePct: 12,
  shippingCost: 9.5, shippingCharged: 12, otherVariableCosts: 3,
  marginePavimentoPct: 20, policy: 'standard',
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. IL GIRO SI CHIUDE
   ═══════════════════════════════════════════════════════════════════════════ */
test('quello che entra esce identico', async (t) => {
  const tpl = T.daStato(STATO, { name: 'Targhe premiazione', category: 'laser', desc: 'ASD, 30 pz' });
  const rientro = T.aStato(tpl);

  await t.test('tutti e ventuno i campi economici sopravvivono', () => {
    const persi = T.CAMPI_PREZZO.filter((k) => STATO[k] !== undefined && rientro[k] === undefined);
    assert.equal(persi.length, 0, 'persi al primo giro: ' + persi.join(', '));
  });

  await t.test('e portano lo stesso valore', () => {
    T.CAMPI_PREZZO.forEach((k) => {
      if (STATO[k] === undefined) return;
      assert.equal(rientro[k], STATO[k], k + ': ' + rientro[k] + ' ≠ ' + STATO[k]);
    });
  });

  await t.test('le righe tornano tutte, con quantità e costi', () => {
    assert.equal(rientro.lines.length, 3);
    assert.equal(rientro.lines.map((l) => l.qty).join(','), '30,6,40');
    assert.equal(rientro.lines.map((l) => l.unitCost).join(','), '2.4,1.8,0.3');
    assert.equal(rientro.lines.map((l) => l.name).join('|'), 'Targa incisa|MDF 3mm|Montaggio');
  });

  await t.test('il collegamento al magazzino sopravvive al template', () => {
    /* Un lavoro ricaricato fra sei mesi deve sapere ancora quale materiale
       consuma: senza, il costo reale non può arrivare dal registro. */
    assert.equal(rientro.lines[0].itemKey, 'items:7');
    assert.equal(rientro.lines[1].itemKey, 'items:3');
    assert.equal(rientro.lines[2].itemKey, null, 'la manodopera non è un articolo di magazzino');
  });

  await t.test('le righe ricevono id nuovi: sono voci nuove di un preventivo nuovo', () => {
    assert.ok(rientro.lines.every((l) => l.id != null));
    assert.equal(new Set(rientro.lines.map((l) => l.id)).size, 3, 'gli id devono essere distinti');
  });

  await t.test('due giri di fila non perdono niente', () => {
    const due = T.aStato(T.daStato(T.aStato(tpl), { name: 'x', category: 'laser' }));
    T.CAMPI_PREZZO.forEach((k) => {
      if (STATO[k] === undefined) return;
      assert.equal(due[k], STATO[k], k + ' perso al secondo giro');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. IL CONTROLLO NEGATIVO — cosa succedeva prima
   ═══════════════════════════════════════════════════════════════════════════ */
test('lo schema vecchio perdeva metà del lavoro', async (t) => {
  /* Il template com'era: righe, markup, sconto e basta. */
  const vecchio = { id: 1, name: 'Vecchio', desc: '', lines: STATO.lines, markup: 160, discount: 8, ts: 1700000000000 };

  await t.test('conservava tre campi economici su ventuno', () => {
    const migrato = T.migra(vecchio);
    const presenti = Object.keys(migrato.pricing).length;
    assert.equal(presenti, 2, 'markup e sconto, e nient\'altro');
    const nelNuovo = Object.keys(T.daStato(STATO, { name: 'x' }).pricing).length;
    assert.ok(nelNuovo > presenti * 6, 'il nuovo ne conserva ' + nelNuovo + ', il vecchio ' + presenti);
  });

  await t.test('IVA, spedizione e commissioni tornavano al predefinito senza dirlo', () => {
    const rientro = T.aStato(vecchio);
    for (const k of ['vatPct', 'shippingCost', 'marketplaceFeePct', 'setupCost', 'policy']) {
      assert.equal(rientro[k], undefined, k + ' non poteva essere conservato dallo schema 1');
    }
  });

  await t.test('ma i vecchi template si leggono ancora', () => {
    const rientro = T.aStato(vecchio);
    assert.equal(rientro.lines.length, 3);
    assert.equal(rientro.markupPct, 160);
    assert.equal(rientro.discountPct, 8);
  });

  await t.test('e sono marcati come migrati, invece di sembrare completi', () => {
    assert.equal(T.migra(vecchio)._migrato, true);
    assert.equal(T.riepilogo(vecchio).migrato, true);
    assert.equal(T.riepilogo(T.daStato(STATO, { name: 'x' })).migrato, false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. VALIDAZIONE
   ═══════════════════════════════════════════════════════════════════════════ */
test('quello che non si salva', async (t) => {
  const casi = [
    ['senza nome', { lines: STATO.lines }, /nome/i],
    ['senza voci', { name: 'Vuoto', lines: [] }, /senza voci/i],
    ['categoria inventata', { name: 'X', lines: STATO.lines, category: 'astrologia' }, /Categoria sconosciuta/],
    ['quantità zero', { name: 'X', lines: [{ name: 'a', qty: 0, unitCost: 1 }] }, /quantità/i],
  ];
  for (const [nome, tpl, atteso] of casi) {
    await t.test(nome, () => {
      const v = T.valida(tpl);
      assert.equal(v.valido, false);
      assert.ok(v.errori.some((e) => atteso.test(e)), 'errori: ' + v.errori.join(' / '));
    });
  }

  await t.test('un template completo passa', () => {
    const v = T.valida(T.daStato(STATO, { name: 'Buono', category: 'laser' }));
    assert.equal(v.valido, true, v.errori.join(' / '));
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. RITROVARE UN TEMPLATE FRA QUARANTA
   ═══════════════════════════════════════════════════════════════════════════ */
test('ricerca, filtro e ordinamento', async (t) => {
  const elenco = [
    T.daStato(STATO, { name: 'Targhe premiazione', category: 'laser', usoConteggio: 12 }),
    T.daStato(STATO, { name: 'Bomboniere matrimonio', category: 'bomboniere', usoConteggio: 3, desc: 'tazze e sacchetti' }),
    T.daStato({ lines: [{ name: 'Portachiavi', qty: 100, unitCost: 0.4, subtotal: 40 }] }, { name: 'Portachiavi bambù', category: 'laser', usoConteggio: 40 }),
    T.daStato({ lines: [{ name: 'T-shirt', qty: 20, unitCost: 4, subtotal: 80 }] }, { name: 'Evento sportivo', category: 'dtf', usoConteggio: 1 }),
  ];
  elenco.forEach((t2, i) => { t2.ts = 1000 + i; });

  await t.test('la ricerca guarda anche dentro le voci', () => {
    assert.equal(T.cerca(elenco, { q: 'portachiavi' }).length, 1);
    assert.equal(T.cerca(elenco, { q: 'MDF' }).length, 2, 'due template contengono una riga MDF');
    assert.equal(T.cerca(elenco, { q: 'tazze' }).length, 1, 'la ricerca guarda anche la descrizione');
  });

  await t.test('il filtro per categoria', () => {
    assert.equal(T.cerca(elenco, { category: 'laser' }).length, 2);
    assert.equal(T.cerca(elenco, { category: 'tutte' }).length, 4);
  });

  await t.test('ricerca e filtro si combinano, nell\'ordine giusto', () => {
    assert.equal(T.cerca(elenco, { q: 'portachiavi', category: 'laser' }).length, 1);
    assert.equal(T.cerca(elenco, { q: 'portachiavi', category: 'dtf' }).length, 0);
  });

  await t.test('gli ordinamenti', () => {
    assert.equal(T.cerca(elenco, { ordine: 'usati' })[0].name, 'Portachiavi bambù');
    assert.equal(T.cerca(elenco, { ordine: 'nome' })[0].name, 'Bomboniere matrimonio');
    assert.equal(T.cerca(elenco, { ordine: 'recenti' })[0].name, 'Evento sportivo');
  });

  await t.test('le categorie vuote non compaiono', () => {
    const cats = T.perCategoria(elenco);
    assert.equal(cats.length, 3, 'laser, bomboniere, dtf — non le otto dell\'elenco');
    assert.equal(cats.find((c) => c.id === 'laser').quanti, 2);
    assert.ok(!cats.some((c) => c.id === 'uv'));
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. RIEPILOGO, DUPLICAZIONE, USO
   ═══════════════════════════════════════════════════════════════════════════ */
test('il riepilogo dice cosa c\'è dentro', async (t) => {
  const tpl = T.daStato(STATO, { name: 'X', category: 'laser' });
  const r = T.riepilogo(tpl);

  await t.test('conta voci, pezzi e costo', () => {
    assert.equal(r.voci, 3);
    assert.equal(r.pezzi, 76);
    assert.ok(Math.abs(r.costo - 94.8) < 0.001);
  });

  await t.test('dice quante righe sono collegate al magazzino', () => {
    assert.equal(r.collegate, 2);
  });

  await t.test('e quanti campi economici porta con sé', () => {
    assert.ok(r.economia >= 15, 'atteso un template completo, trovati ' + r.economia + ' campi');
  });

  await t.test('il costo lo somma, il prezzo no', () => {
    /* Il prezzo è del motore. Un modulo che lo calcolasse qui sarebbe il
       secondo motore di prezzo, che è il difetto contro cui questo progetto
       ha speso quattro fasi. */
    assert.equal(r.prezzo, undefined);
    const sorgente = fs.readFileSync('src/product/quote-templates.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/marginePct\s*\/\s*100|1\s*-\s*\w*margin/i.test(sorgente), 'il modulo non deve contenere matematica di prezzo');
  });
});

test('duplicare e usare', async (t) => {
  const tpl = T.daStato(STATO, { name: 'Originale', category: 'laser', usoConteggio: 9 });
  tpl.id = 42;

  await t.test('il duplicato non eredita l\'uso dell\'originale', () => {
    const c = T.duplica(tpl);
    assert.equal(c.usoConteggio, 0);
    assert.equal(c.usatoIl, null);
    assert.equal(c.id, undefined, 'un duplicato è un record nuovo');
    assert.equal(c.name, 'Originale (copia)');
  });

  await t.test('ma eredita tutto il resto', () => {
    const c = T.duplica(tpl);
    assert.equal(JSON.stringify(c.lines), JSON.stringify(tpl.lines));
    assert.equal(JSON.stringify(c.pricing), JSON.stringify(tpl.pricing));
  });

  await t.test('e non tocca l\'originale', () => {
    const prima = JSON.stringify(tpl);
    T.duplica(tpl, 'Altro nome');
    assert.equal(JSON.stringify(tpl), prima);
  });

  await t.test('l\'uso si conta quando il template viene caricato', () => {
    const usato = T.segnaUso(tpl);
    assert.equal(usato.usoConteggio, 10);
    assert.ok(usato.usatoIl);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. SCAMBIO FRA POSTAZIONI
   ═══════════════════════════════════════════════════════════════════════════ */
test('esportare e reimportare', async (t) => {
  const elenco = [
    Object.assign(T.daStato(STATO, { name: 'Uno', category: 'laser' }), { id: 1 }),
    Object.assign(T.daStato(STATO, { name: 'Due', category: 'dtf' }), { id: 2 }),
  ];
  const pacchetto = T.perEsportazione(elenco);

  await t.test('il pacchetto si dichiara', () => {
    assert.equal(pacchetto.formato, 'ingly-quote-templates');
    assert.equal(pacchetto.schemaVersion, T.SCHEMA);
    assert.equal(pacchetto.templates.length, 2);
  });

  await t.test('gli id non viaggiano: sono di chi importa', () => {
    assert.ok(pacchetto.templates.every((x) => x.id === undefined));
  });

  await t.test('il rientro non perde niente', () => {
    const dentro = T.daImportazione(JSON.stringify(pacchetto));
    assert.equal(dentro.ok, true);
    assert.equal(dentro.templates.length, 2);
    assert.equal(JSON.stringify(T.aStato(dentro.templates[0]).lines.map((l) => l.name)),
      JSON.stringify(STATO.lines.map((l) => l.name)));
  });

  await t.test('un file di un altro programma viene rifiutato', () => {
    assert.equal(T.daImportazione('{"formato":"qualcos-altro"}').ok, false);
    assert.equal(T.daImportazione('non è json').ok, false);
    assert.match(T.daImportazione('non è json').motivo, /JSON/);
  });

  await t.test('i template rotti vengono scartati, non importati a metà', () => {
    const sporco = { formato: 'ingly-quote-templates', schemaVersion: 2, templates: [
      pacchetto.templates[0], { name: '', lines: [] }, { name: 'Senza voci', lines: [] },
    ] };
    const dentro = T.daImportazione(sporco);
    assert.equal(dentro.templates.length, 1);
    assert.equal(dentro.scartati.length, 2);
    assert.ok(dentro.scartati[0].motivi.length);
  });
});

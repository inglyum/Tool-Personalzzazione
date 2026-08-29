/**
 * architecture-cost-engine.test.mjs — «adesso usa il motore» è una misura.
 *
 * Un motore unico non si ottiene dichiarandolo: si ottiene togliendo il conto
 * da tutti i posti in cui era finito. Questo file guarda il **file consegnato**
 * e verifica che i moduli lo usino davvero — e, soprattutto, che non abbiano
 * più la propria matematica accanto.
 *
 * Il pericolo che presidia non è teorico: due motori che coesistono danno due
 * prezzi allo stesso lavoro, e vince quello che è stato caricato per ultimo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DIST = 'dist/INGLY-OS.html';
const dist = fs.readFileSync(DIST, 'utf8');

/** Il codice senza i commenti: un commento che nomina una formula non la esegue. */
function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

const sorgente = (p) => soloCodice(fs.readFileSync(p, 'utf8'));

/* I moduli che devono passare dal motore, con il file in cui vivono. */
const CONSUMATORI = [
  { nome: 'Smart Quoter 3D', file: 'src/product/print3d-cost.js' },
  { nome: 'Smart Quote Apparel', file: 'src/legacy/patches/069-smart-quote-apparel-v2-modulo-professionale-abbi.js' },
  { nome: 'Laser Quoter B2B', file: 'src/legacy/patches/096-ingly-os-v37c-laserb2b-master-consolidato.js' },
  {
    nome: 'PricingEngine (Catalogo + Product Builder)',
    file: 'src/legacy/app/src/modules/catalog/index.js',
    /* Di questo file è migrato `PricingEngine`, non l'intero modulo: il
       Catalogo contiene anche i listini B2B, che hanno una propria scaletta di
       prezzi non ancora consolidata. Restringere il controllo alla porzione
       migrata è l'unico modo di dire la verità: se guardassi tutto il file
       fallirei per codice che non ho ancora toccato, e la tentazione sarebbe
       di allentare il controllo invece di finire il lavoro.
       Quel che resta è contato — non nascosto — dal cricchetto più in basso. */
    porzione: ['const PricingEngine={', '\n};'],
  },
];

/** La porzione di file che riguarda il consumatore, o il file intero. */
function porzioneDi(c) {
  const s = sorgente(c.file);
  if (!c.porzione) return s;
  const i = s.indexOf(c.porzione[0]);
  assert.ok(i >= 0, 'porzione non trovata in ' + c.file);
  const f = s.indexOf(c.porzione[1], i);
  return s.slice(i, f > 0 ? f : undefined);
}

test('il motore è uno solo', async (t) => {
  await t.test('esiste nel file consegnato', () => {
    assert.ok(dist.includes('global.InglyCostEngine = {'), 'InglyCostEngine non è nel file consegnato');
  });

  await t.test('nessun secondo motore con un altro nome', () => {
    /* I nomi che un consolidamento fatto male produce: CostEngineV2, Pro,
       LaserCostEngine. Se compaiono, il consolidamento è stato solo rinviato. */
    for (const vietato of ['CostEngineV2', 'CostEnginePro', 'LaserCostEngine', 'PrintCostEngine', 'ApparelCostEngine', 'CostEngineNew']) {
      assert.ok(!dist.includes(vietato), 'esiste un secondo motore: ' + vietato);
    }
  });

  await t.test('i cinque profili richiesti sono nel file consegnato', () => {
    for (const p of ['print3d:', 'laser:', 'uv:', 'dtf:', 'sublimation:']) {
      assert.ok(dist.includes(p), 'manca il profilo ' + p);
    }
  });
});

test('ogni quoter passa dal motore', async (t) => {
  for (const c of CONSUMATORI) {
    await t.test(c.nome + ' chiama InglyCostEngine', () => {
      assert.ok(porzioneDi(c).includes('InglyCostEngine'), c.file + ' non usa il motore');
    });
  }
});

test('nessun quoter ha più la propria matematica di prezzo', async (t) => {
  /* Le forme in cui la matematica di prezzo sopravvive a una migrazione fatta
     a metà. Ognuna è stata trovata davvero in questo codice, non immaginata. */
  const FORME = [
    { id: 'margine', re: /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)/i, cosa: 'prezzo da margine calcolato a mano' },
    { id: 'ricarico', re: /\*\s*\(\s*1\s*\+\s*[\w.]*(?:margin|markup|ricarico)/i, cosa: 'prezzo da ricarico calcolato a mano' },
    { id: 'sconto', re: /\*\s*\(\s*1\s*-\s*[\w.]*(?:disc|sconto)/i, cosa: 'sconto applicato al prezzo a mano' },
    { id: 'iva', re: /\*\s*1\.22\b/, cosa: 'IVA moltiplicata a mano' },
  ];

  for (const c of CONSUMATORI) {
    await t.test(c.nome, () => {
      const s = porzioneDi(c);
      const trovate = FORME.filter((f) => f.re.test(s)).map((f) => f.cosa);
      assert.deepEqual(trovate, [], c.file + ': ' + trovate.join(' · '));
    });
  }
});

test('gli adapter dipendono dal motore e lo dichiarano', async (t) => {
  await t.test('nel bundle il motore precede chi lo usa', () => {
    /* Un adapter caricato prima del motore non troverebbe nulla e
       restituirebbe un preventivo vuoto: l'ordine è una dipendenza reale. */
    /* L'**export** del motore, non il primo che lo nomina: da quando altri
       moduli lo referenziano, cercare il nome trovava un chiamante. */
    const posMotore = dist.indexOf('global.InglyCostEngine = {');
    const posAdapter = dist.indexOf('global.InglyPrint3D = {');
    assert.ok(posMotore > 0 && posAdapter > 0);
    assert.ok(posMotore < posAdapter, 'InglyPrint3D è composto prima del motore che usa');
  });

  await t.test('senza il motore nessuno inventa un prezzo', () => {
    /* La regola non negoziabile: un preventivo sbagliato è peggio di un
       preventivo mancante. Chi non ha il motore lo dichiara. */
    for (const c of CONSUMATORI) {
      const s = porzioneDi(c);
      assert.ok(
        /non disponibile|indisponibile|empty:\s*true/.test(s),
        c.file + ': non gestisce l\'assenza del motore',
      );
    }
  });
});

test('le politiche di prezzo hanno un nome', async (t) => {
  await t.test('Laser B2B non ha più costanti sepolte nel calcolo', () => {
    const s = sorgente('src/legacy/patches/096-ingly-os-v37c-laserb2b-master-consolidato.js');
    assert.ok(s.includes('POLITICHE'), 'le politiche non sono dichiarate');
    /* Prima erano `Math.max(15, …)` e `0.65 * …` dentro la formula: numeri
       commerciali travestiti da matematica. */
    assert.ok(!/Math\.max\(15\s*,/.test(s), 'il prezzo minimo è ancora scritto nella formula');
    assert.ok(!/0\.65\s*\*\s*\(fp/.test(s), 'la quota rivenditore è ancora scritta nella formula');
  });
});

test('il motore resta puro anche nel file consegnato', () => {
  /* Nel bundle il motore convive con 9 MB di codice che tocca DOM, archivio e
     orologio. La sua porzione non deve averne assorbito niente. */
  const inizio = dist.indexOf('INGLY COST ENGINE');
  const fine = dist.indexOf('global.InglyCostEngine = {');
  assert.ok(inizio > 0 && fine > inizio, 'il motore non si trova nel file consegnato');
  const porzione = soloCodice(dist.slice(inizio, fine));
  for (const vietato of ['Math.random', 'new Date', 'Date.now', 'localStorage', 'document.getElementById', 'fetch(']) {
    assert.ok(!porzione.includes(vietato), 'il motore consegnato usa ' + vietato);
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   Il cricchetto.

   «55 file hanno formule» è un numero che spaventa e non aiuta: dentro ci sono
   barre di completamento, medie di vendita e conversioni di unità. Portarlo a
   zero cancellando aritmetica innocua sarebbe lavoro sprecato che sembra
   progresso.

   `scripts/classify-pricing-math.mjs` separa le sei categorie e isola quella
   che conta: i **motori di prezzo duplicati**. Questi tetti li presidiano.
   Nessuno può salire; scendono a mano, insieme al codice che li produce.
   ═══════════════════════════════════════════════════════════════════════════ */
test('i motori di prezzo duplicati non crescono', async (t) => {
  const { execFileSync } = await import('node:child_process');
  const dati = JSON.parse(execFileSync('node', ['scripts/classify-pricing-math.mjs', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));

  /* Misurati oggi. Ogni riduzione va accompagnata dall'abbassamento del tetto:
     è il modo per accorgersi se un numero risale in silenzio. */
  const TETTI = {
    motoriDuplicati: 13,      // categoria D — un secondo conto del prezzo
    regoleDaEstrarre: 7,      // categoria E — politiche commerciali nel codice
  };

  for (const [chiave, tetto] of Object.entries(TETTI)) {
    await t.test(chiave + ' ≤ ' + tetto, () => {
      const attuale = dati.riassunto[chiave];
      assert.ok(
        attuale <= tetto,
        chiave + ' è salito a ' + attuale + ' (tetto ' + tetto + '). ' +
        'Chi ha aggiunto una formula di prezzo la sposti in InglyCostEngine, ' +
        'e chi ha aggiunto una soglia commerciale la dichiari come politica.',
      );
    });
  }

  await t.test('il motore resta uno solo', () => {
    assert.equal(dati.riassunto.perCategoria.A, 1, 'esiste più di un motore di costo');
  });
});

test('le forme vietate non aumentano', async (t) => {
  /* I singoli difetti, contati uno per uno invece che a file: un file può
     migliorare di nove formule e peggiorare di dieci senza che il conteggio
     per file se ne accorga. */
  const file = [];
  (function raccogli(dir) {
    for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = dir + '/' + v.name;
      if (v.isDirectory()) { if (v.name !== 'vendor') raccogli(p); }
      else if (/\.(js|mjs)$/.test(v.name)) file.push(p);
    }
  })('src');

  const FORME = {
    'prezzo da margine a mano': /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)/gi,
    'prezzo da ricarico a mano': /\*\s*\(\s*1\s*\+\s*[\w.]*(?:markup|ricarico|margin)/gi,
    'sconto sul prezzo a mano': /\*\s*\(\s*1\s*-\s*[\w.]*(?:disc|sconto)/gi,
    'IVA a mano': /\*\s*1\.22\b/g,
    'scaglione di sconto nel codice': /qty\s*>=?\s*\d+\s*\?\s*[\d.]+\s*:/gi,
  };
  /* Misurati — non stimati — dopo la migrazione di quoter, 3D, laser, apparel
     e catalogo. Il primo tentativo li aveva indovinati, e due erano sbagliati:
     un cricchetto tarato a occhio o è inutile perché troppo largo, o blocca il
     lavoro perché troppo stretto. */
  const TETTI = {
    'prezzo da margine a mano': 1,
    'prezzo da ricarico a mano': 13,
    'sconto sul prezzo a mano': 28,
    'IVA a mano': 6,
    'scaglione di sconto nel codice': 39,
  };

  const conteggi = {};
  for (const nome of Object.keys(FORME)) conteggi[nome] = 0;
  for (const f of file) {
    const s = soloCodice(fs.readFileSync(f, 'utf8'));
    for (const [nome, re] of Object.entries(FORME)) conteggi[nome] += (s.match(re) || []).length;
  }

  for (const [nome, tetto] of Object.entries(TETTI)) {
    await t.test(nome + ' ≤ ' + tetto, () => {
      assert.ok(conteggi[nome] <= tetto, nome + ': ' + conteggi[nome] + ' (tetto ' + tetto + ')');
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Il cricchetto.

   59 file avevano una propria matematica di prezzo quando questa migrazione è
   cominciata. Non spariscono in un passaggio, e fingere il contrario sarebbe
   il modo più rapido per rompere un gestionale che qualcuno usa per lavorare.

   Quello che si può garantire subito è che **non crescano**: ogni nuovo posto
   in cui qualcuno riscrive una formula di prezzo fa fallire questo test. Il
   numero si abbassa a mano, insieme al codice che lo produce.
   ═══════════════════════════════════════════════════════════════════════════ */
test('i residui non crescono', () => {
  const TETTO = 55;   // misurato dopo l esclusione delle librerie di terzi

  const file = [];
  (function raccogli(dir) {
    for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = dir + '/' + v.name;
      if (v.isDirectory()) raccogli(p);
      else if (/\.(js|mjs)$/.test(v.name)) file.push(p);
    }
  })('src');

  const FORME = [
    /parse(?:Float|Int)\s*\(\s*(?:document\.getElementById|eid\(|[\w$]+\.value)/,
    /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)/i,
    /\*\s*\(\s*1\s*[+-]\s*[\w.]*(?:margin|markup|ricarico|disc|sconto)/i,
    /\*\s*1\.22\b/,
  ];

  const conMatematica = file.filter((f) => {
    const s = soloCodice(fs.readFileSync(f, 'utf8'));
    return FORME.some((re) => re.test(s));
  });
  const residui = conMatematica.filter((f) => {
    const s = soloCodice(fs.readFileSync(f, 'utf8'));
    return !/InglyCostEngine/.test(s);
  });

  assert.ok(
    residui.length <= TETTO,
    'i file con matematica di prezzo propria sono saliti a ' + residui.length +
    ' (tetto ' + TETTO + '). Chi ha aggiunto una formula la sposti nel motore.',
  );
});

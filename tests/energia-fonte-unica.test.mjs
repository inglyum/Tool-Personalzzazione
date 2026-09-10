/**
 * energia-fonte-unica.test.mjs — il prezzo del kilowattora ha un padrone solo.
 *
 * Misurato prima di scrivere questo file: `0.28` compariva scritto a mano in
 * tredici file sorgente — il preventivatore 3D, il calcolatore laser, il
 * catalogo macchine e dieci patch che se lo ricopiavano a vicenda. Cambiare il
 * prezzo dell'energia significava trovarli tutti, e nessuno li trovava tutti.
 *
 * Quello che si verifica qui:
 *
 *   1. il modulo puro dichiara il valore di partenza e dice che è di partenza;
 *   2. un prezzo dichiarato dall'utente vince e sale a `declared`;
 *   3. `ingresso()` porta `kwhPrice` insieme agli altri numeri del laboratorio,
 *      così che chi legge i profili non debba andarselo a prendere altrove;
 *   4. le due schermate che se lo tenevano non se lo tengono più.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-profiles.js', 'utf8'), sandbox);
const P = sandbox.window.InglyCostProfiles;

/* ── 1. Il valore di partenza si dichiara ────────────────────────────────── */

test('energia: il modulo espone la funzione e la costante', () => {
  assert.equal(typeof P.energia, 'function');
  assert.ok(P.ENERGIA_PREDEFINITA > 0, 'senza un valore di partenza l\'energia non entrerebbe in nessun preventivo');
});

test('energia: senza profilo si usa il valore di partenza e lo si dichiara', () => {
  const e = P.energia(null);
  assert.equal(e.kwhPrice, P.ENERGIA_PREDEFINITA);
  assert.equal(e.predefinito, true);
  assert.equal(e.confidence, 'estimated');
  assert.ok(e.avvisi.length > 0, 'un valore non dichiarato deve dirlo, altrimenti sembra un dato');
});

test('energia: un profilo vuoto non conta come dichiarazione', () => {
  assert.equal(P.energia({}).confidence, 'estimated');
  assert.equal(P.energia({ kwhPrice: 0 }).confidence, 'estimated');
  assert.equal(P.energia({ kwhPrice: '' }).confidence, 'estimated');
});

/* ── 2. Il prezzo dichiarato vince ───────────────────────────────────────── */

test('energia: il prezzo scritto dall\'utente vince sul valore di partenza', () => {
  const e = P.energia({ kwhPrice: 0.41 });
  assert.equal(e.kwhPrice, 0.41);
  assert.equal(e.predefinito, false);
  assert.equal(e.confidence, 'declared');
  assert.equal(e.avvisi.length, 0);
});

test('energia: un prezzo negativo non passa', () => {
  assert.equal(P.energia({ kwhPrice: -0.3 }).kwhPrice, P.ENERGIA_PREDEFINITA);
});

test('energia: una stringa numerica vale come numero', () => {
  assert.equal(P.energia({ kwhPrice: '0.35' }).kwhPrice, 0.35);
});

/* ── 3. Entra nell'ingresso del motore ───────────────────────────────────── */

test('ingresso: kwhPrice viaggia insieme agli altri numeri del laboratorio', () => {
  const i = P.ingresso({}, {});
  assert.equal(i.kwhPrice, P.ENERGIA_PREDEFINITA);
  assert.equal(i._fonti.energia, 'estimated');
  assert.equal(i._predefiniti.energia, true);
});

test('ingresso: il prezzo dichiarato arriva fino al motore', () => {
  const i = P.ingresso({ overhead: { kwhPrice: 0.52 } }, {});
  assert.equal(i.kwhPrice, 0.52);
  assert.equal(i._fonti.energia, 'declared');
  assert.equal(i._predefiniti.energia, false);
});

test('ingresso: l\'avviso sull\'energia arriva insieme agli altri', () => {
  const i = P.ingresso({}, {});
  const suEnergia = i._avvisi.filter((a) => /energia/i.test(a));
  assert.equal(suEnergia.length, 1, 'l\'avviso deve esserci una volta sola');
});

test('ingresso: dichiarare l\'energia toglie il suo avviso e non tocca gli altri', () => {
  const senza = P.ingresso({}, {});
  const con = P.ingresso({ overhead: { kwhPrice: 0.3 } }, {});
  assert.equal(con._avvisi.length, senza._avvisi.length - 1);
  assert.equal(con._avvisi.filter((a) => /energia/i.test(a)).length, 0);
});

test('ingresso: l\'energia non altera la manodopera né le spese generali', () => {
  const a = P.ingresso({}, {});
  const b = P.ingresso({ overhead: { kwhPrice: 0.9 } }, {});
  assert.equal(a.laborPerHour, b.laborPerHour);
  assert.equal(a.overheadPerHour, b.overheadPerHour);
  assert.equal(a.overheadPerJob, b.overheadPerJob);
  assert.equal(a.overheadPct, b.overheadPct);
});

/* ── 4. Le due schermate non se lo tengono più ───────────────────────────── */

const catalogo = fs.readFileSync('src/legacy/app/src/modules/catalog/index.js', 'utf8');
const markup004 = fs.readFileSync('src/legacy/markup/004.html', 'utf8');
const markup005 = fs.readFileSync('src/legacy/markup/005.html', 'utf8');

test('il Calcolatore Laser non porta più il prezzo dell\'energia nel markup', () => {
  const campo = markup004.match(/<input[^>]*id="lcp-kwh"[^>]*>/);
  assert.ok(campo, 'il campo lcp-kwh non esiste più');
  assert.ok(!/value=/.test(campo[0]), 'il valore va letto dai profili, non scritto nel markup: ' + campo[0]);
});

test('il Calcolatore Laser non porta più la tariffa oraria nel markup', () => {
  const campo = markup004.match(/<input[^>]*id="lcp-labor"[^>]*>/);
  assert.ok(campo);
  assert.ok(!/value=/.test(campo[0]), campo[0]);
});

test('il Catalogo macchine non porta più i due numeri nel markup', () => {
  const kwh = markup005.match(/<input[^>]*id="cm-kwh"[^>]*>/);
  const lab = markup005.match(/<input[^>]*id="cm-labor"[^>]*>/);
  assert.ok(kwh && lab);
  assert.ok(!/value=/.test(kwh[0]), kwh[0]);
  assert.ok(!/value=/.test(lab[0]), lab[0]);
});

test('entrambe le schermate hanno il nodo che dice la provenienza', () => {
  assert.ok(markup004.includes('id="lcp-profilo-nota"'));
  assert.ok(markup005.includes('id="cm-profilo-nota"'));
});

test('il catalogo legge i profili invece di reinventarli', () => {
  assert.ok(/function _labProfilo/.test(catalogo), 'manca il lettore dei profili');
  assert.ok(/InglyCostProfilesStore/.test(catalogo), 'il lettore non arriva allo store');
});

test('i quattro ripieghi delle due schermate non sono più numeri scritti a mano', () => {
  /* Erano: `|| 0.28` e `|| 15` nel Calcolatore Laser, `p.kwh||0.28` e
     `p.labor||18` nel Catalogo. Ognuno era un quinto posto in cui il numero
     poteva divergere. */
  assert.ok(!/eid\('lcp-kwh'\)\?\.value\s*\|\|\s*0\.28/.test(catalogo));
  assert.ok(!/eid\('lcp-labor'\)\?\.value\s*\|\|\s*15/.test(catalogo));
  assert.ok(!/p\.kwh\s*\|\|\s*0\.28/.test(catalogo));
  assert.ok(!/p\.labor\s*\|\|\s*18/.test(catalogo));
  assert.ok(/_lab\.kwh/.test(catalogo) && /_lab\.labor/.test(catalogo));
});

test('il valore del profilo non viene congelato in localStorage', () => {
  /* Il difetto che questo controllo esiste per impedire: `saveSettings()`
     salvava tutti i campi a ogni ricalcolo. Il primo rendering avrebbe scritto
     in archivio il valore del profilo, e da lì in poi cambiare i profili non
     avrebbe cambiato più niente — il collegamento sarebbe esistito solo il
     giorno in cui è stato scritto. */
  const salva = catalogo.match(/saveSettings\(\)\s*\{[\s\S]*?\n  \},/);
  assert.ok(salva, 'saveSettings non trovata');
  assert.ok(/daProfilo/.test(salva[0]), 'saveSettings salva ancora tutto senza confrontare col profilo');

  const salvaMacchina = catalogo.match(/saveMachineParams\(\)\s*\{[\s\S]*?\n  \},/);
  assert.ok(salvaMacchina, 'saveMachineParams non trovata');
  assert.ok(/delete rec\.kwh/.test(salvaMacchina[0]) && /delete rec\.labor/.test(salvaMacchina[0]),
    'saveMachineParams congela ancora i due valori del profilo');
});

/* ── 5. Lo store sa scriverlo senza cancellare il resto ──────────────────── */

const store = fs.readFileSync('src/product/cost-profiles-store.js', 'utf8');

test('lo store espone il salvataggio dell\'energia', () => {
  assert.ok(/salvaEnergia:\s*salvaEnergia/.test(store));
});

test('salvare l\'energia non cancella le spese generali, e viceversa', () => {
  /* Condividono un record: senza lettura preventiva, salvare la corrente
     azzererebbe l'affitto. */
  const en = store.match(/function salvaEnergia[\s\S]*?\n  \}/);
  assert.ok(en && /leggi\('overhead_profiles'\)/.test(en[0]),
    'salvaEnergia scrive senza rileggere: cancellerebbe le voci di spesa');
  const ov = store.match(/function salvaOverhead[\s\S]*?\n  \}/);
  assert.ok(ov && /kwhPrice/.test(ov[0]),
    'salvaOverhead scrive senza preservare il prezzo dell\'energia');
});

/* ── 6. I cinque preventivatori non tengono più una copia del prezzo ────── */

const PATCH = {
  'Smart Quoter 3D': 'src/legacy/patches/108-var-print3dquoter-function.js',
  'Calcolatore macchina laser': 'src/legacy/patches/119-ingly-calcolatore-macchina-laser-v2-0.js',
  'Calcolatore macchine': 'src/legacy/patches/120-ingly-os-calcolatore-macchine-v4-0.js',
  'Laser Quoter B2B': 'src/legacy/patches/121-ingly-os-laser-quoter-b2b-v2-0.js',
  'Smart Quote Apparel': 'src/legacy/patches/069-smart-quote-apparel-v2-modulo-professionale-abbi.js',
};

/** Il prezzo dell'energia scritto a mano. Non conta `kw:0.280` — quello è il
    consumo della macchina in kilowatt, un dato di targa che sta giustamente
    accanto al modello — né i prezzi fornitore che valgono 0,28 per caso. */
function copieDelPrezzo(testo) {
  return testo.split('\n').filter((r) => {
    if (!/0\.28|\b\.28\b/.test(r)) return false;
    if (/\bkw\s*:\s*0\.28/.test(r)) return false;      // kilowatt di targa
    if (/costPer|costSup|cost\s*:|price\s*:|,p:/.test(r)) return false;  // listini fornitore
    if (/hourly\s*:/.test(r)) return false;              // €/h ammortamento
    if (/return 0\.28;/.test(r)) return false;           // il ripiego dichiarato
    return /kwh|energ/i.test(r);
  });
}

for (const [nome, file] of Object.entries(PATCH)) {
  test(nome + ': il prezzo dell\'energia non è più scritto in questo file', () => {
    const copie = copieDelPrezzo(fs.readFileSync(file, 'utf8'));
    assert.equal(copie.length, 0,
      'restano ' + copie.length + ' copie del prezzo:\n' + copie.join('\n'));
  });

  test(nome + ': legge il prezzo dai profili economici', () => {
    const t = fs.readFileSync(file, 'utf8');
    assert.ok(/_energiaProfilo|prezzoEnergia/.test(t), 'nessun lettore dei profili');
    assert.ok(/InglyCostProfilesStore/.test(t), 'il lettore non arriva allo store');
  });
}

test('Apparel: il prezzo non si risolve al caricamento del file', () => {
  /* I predefiniti di un modulo si valutano quando il file viene letto, e in
     quel momento il database non ha ancora risposto: risolvere lì avrebbe
     congelato il valore di partenza per sempre. */
  const t = fs.readFileSync(PATCH['Smart Quote Apparel'], 'utf8');
  const def = t.match(/var DEF_SETTINGS = \{[\s\S]*?\n  \};/);
  assert.ok(def, 'DEF_SETTINGS non trovato');
  assert.ok(!/_energiaProfilo\(\)/.test(def[0]),
    'il prezzo si risolve nei predefiniti: resterebbe quello del primo istante');
  assert.ok(/energyKwh[\s\S]{0,80}_energiaProfilo\(\)/.test(t.match(/function loadS\(\)[\s\S]*?\n  \}/)[0]),
    'loadS() non risolve il prezzo al momento della lettura');
});

test('Quoter 3D: chi scrive il prezzo a mano comanda su quel preventivo', () => {
  const t = fs.readFileSync(PATCH['Smart Quoter 3D'], 'utf8');
  assert.ok(/var ENERGIA_TOCCATA=false;/.test(t));
  assert.ok(/ENERGIA_TOCCATA=false;/.test(t.match(/function reset[\s\S]*?\n\}/)?.[0] || t),
    'il reset non riporta l\'energia a seguire il laboratorio');
  const allinea = t.match(/function _allineaEnergia\(\)\{[\s\S]*?\n\}/);
  assert.ok(allinea && /if\(ENERGIA_TOCCATA\) return;/.test(allinea[0]),
    'l\'allineamento sovrascriverebbe il valore scritto a mano');
});

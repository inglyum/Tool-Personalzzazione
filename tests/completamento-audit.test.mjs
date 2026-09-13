/**
 * completamento-audit.test.mjs — tre difetti trovati girando tutte le sezioni.
 *
 * L'audit apre una per una le 110 voci del menù e misura cosa compare. Ha
 * trovato questo:
 *
 *   1. Tre voci svuotavano lo schermo. «Export Commercialista», «Morning
 *      Briefing» e «Report Mensile» non sono sezioni: sono comandi. La
 *      navigazione spegneva comunque la vista corrente e, non trovandone una
 *      nuova da accendere, lasciava l'area contenuti bianca. Misurato: dopo il
 *      clic nessuna `.section-view` restava attiva. L'export era riuscito e lo
 *      schermo sembrava rotto.
 *
 *   2. Due tabelle vuote senza una parola. Client Intelligence mostrava cinque
 *      riquadri con «0»; Prima Nota una tabella con l'intestazione e niente
 *      sotto. Chi apriva la sezione la prima volta vedeva lo stesso schermo di
 *      chi ha un guasto.
 *
 *   3. Numeri inventati mostrati come dati. «68% margine medio», «2.4M ricerche
 *      personalized», «€24 prezzo medio», «Lombardia regione top»: scritti nel
 *      codice, in riquadri grandi come quelli che altrove mostrano il fatturato
 *      reale. Il §2 del progetto dice che un numero senza fonte non si mostra
 *      come dato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/* ── 1. Un comando nel menù non svuota lo schermo ────────────────────────── */

const app = fs.readFileSync('src/legacy/app/src/core/app.js', 'utf8');

test('navigate sa distinguere una rotta con vista da una senza', () => {
  assert.ok(/const _haVista = !!eid\('view-' \+ section\);/.test(app),
    'navigate non controlla se la rotta ha una vista');
});

test('e se non c\'è vista non spegne quella corrente', () => {
  assert.ok(/if\(_haVista\) document\.querySelectorAll\('\.section-view\.active'\)/.test(app),
    'la vista corrente viene spenta comunque: lo schermo resta bianco');
});

test('né sposta la sezione corrente su un comando', () => {
  /* Spostarla farebbe credere all'applicazione di essere altrove, e il
     prossimo clic sulla sezione di prima non farebbe niente per via della
     guardia anti-doppio-clic in testa a navigate(). */
  const blocco = app.match(/if\(_haVista\)\{\s*\n\s*this\.currentSection=section;[\s\S]*?\n    \}/);
  assert.ok(blocco, 'currentSection si sposta anche sui comandi');
});

test('la regola è generale, non un elenco di tre nomi', () => {
  /* Un elenco invecchia: il prossimo comando aggiunto da una patch
     ricadrebbe nel difetto. */
  assert.ok(!/commercial_export|monthly_report/.test(
    app.match(/const _haVista[\s\S]{0,400}/)[0]),
    'la regola nomina i comandi invece di dedurli');
});

/* ── 2. Le tabelle vuote parlano ─────────────────────────────────────────── */

const clienti = fs.readFileSync('src/legacy/app/src/modules/clients/index.js', 'utf8');

test('Client Intelligence spiega perché è vuota', () => {
  assert.ok(/if \(!paid\.length\)/.test(clienti), 'manca il controllo sulle vendite pagate');
  assert.ok(/Nessuna vendita pagata da segmentare/.test(clienti));
});

test('e distingue i clienti in anagrafica dalle vendite incassate', () => {
  /* È la confusione probabile: «ho dieci clienti, perché non vedo niente?».
     La RFM ha bisogno di incassi, non di anagrafiche. */
  assert.ok(/non solo clienti in anagrafica/.test(clienti));
  assert.ok(/clients\.length \?/.test(clienti), 'il messaggio non si adatta a quanti clienti ci sono');
});

test('e offre la strada per riempirla', () => {
  assert.ok(/App\.navigate\('sales'\)/.test(clienti));
});

const primaNota = fs.readFileSync('src/legacy/patches/059-ingly-os-v11-dashboard-widget-import-csv-etsy-li.js', 'utf8');

test('Prima Nota spiega che si compila da sola', () => {
  assert.ok(/Nessun movimento registrato/.test(primaNota));
  assert.ok(/non si scrive a mano/.test(primaNota),
    'non dice che i movimenti arrivano dalle vendite');
});

test('e lo stato vuoto sta dentro la tabella, non sopra', () => {
  /* Sopra la tabella resterebbe l'intestazione delle colonne con il vuoto
     sotto: due messaggi contraddittori nello stesso riquadro. */
  assert.ok(/<tbody>\s*\n\s*\$\{!entries\.length \?/.test(primaNota));
});

/* ── 3. I numeri di esempio si dichiarano ────────────────────────────────── */

const moduliAi = fs.readFileSync('src/legacy/patches/106-ingly-os-v27-13-moduli-ai-editabili-rendering-bu.js', 'utf8');

test('i riquadri dei moduli di analisi dichiarano di essere esempi', () => {
  assert.ok(/valori di esempio/.test(moduliAi), 'manca l\'avviso');
  assert.ok(/esempio da sostituire/.test(moduliAi), 'manca l\'etichetta sul singolo riquadro');
});

test('l\'avviso compare solo se c\'è almeno un valore di esempio', () => {
  const f = moduliAi.match(/function kpiGrid\(kpis\)\{[\s\S]*?\n  \}/);
  assert.ok(f, 'kpiGrid non trovata');
  assert.ok(/daSostituire\s*\?/.test(f[0]),
    'l\'avviso compare sempre, anche su una sezione con soli dati veri');
});

test('e un numero davvero calcolato può dirlo e non porta l\'etichetta', () => {
  /* Senza questa via d'uscita, il giorno in cui uno di questi moduli
     calcolasse il suo numero dai dati dell'utente continuerebbe a chiamarlo
     esempio — e la dicitura diventerebbe rumore da ignorare. */
  const f = moduliAi.match(/function kpiGrid\(kpis\)\{[\s\S]*?\n  \}/)[0];
  assert.ok(/k\.reale/.test(f), 'non c\'è modo di dichiarare un valore reale');
  assert.ok(/label:'Idee in elenco',color:'#22c55e',reale:true/.test(moduliAi),
    'il conteggio delle idee — che è un dato vero — non è dichiarato tale');
});

test('i conteggi delle righe in tabella sono dichiarati dati veri', () => {
  /* `.length` di una tabella che l'utente compila e' una misura, non un
     esempio: chiamarla esempio insegnerebbe a ignorare la dicitura proprio
     dove invece serve. Qui la prima versione del test dava per scontato che
     `trendscanner` non usasse i riquadri — li usa, e il conteggio dei trend
     era marcato come esempio insieme al «+350%» che esempio e' davvero. */
  for (const conteggio of ['_aiData_products', '_aiData_trends']) {
    const riga = moduliAi.split('\n').find((r) => r.includes(conteggio + '||'));
    assert.ok(riga, 'conteggio ' + conteggio + ' non trovato');
    assert.ok(/reale:true/.test(riga),
      conteggio + ': un conteggio di righe reali e\' marcato come esempio');
  }
});

test('e i valori che restano esempi non lo sono', () => {
  /* Controprova: «+350%» e «68%» non hanno fonte e devono restare dichiarati. */
  const righe350 = moduliAi.split('\n').filter((r) => /\+350%|'68%'/.test(r));
  assert.ok(righe350.length >= 2, 'valori di esempio non trovati');
  for (const r of righe350) {
    const pezzo = r.match(/\{val:'(\+350%|68%)'[^}]*\}/);
    if (pezzo) assert.ok(!/reale:true/.test(pezzo[0]),
      'un numero senza fonte e\' dichiarato reale: ' + pezzo[0]);
  }
});

#!/usr/bin/env node
/**
 * rotte-e-pulsanti.mjs — FASI 20-23 del collaudo funzionale.
 *
 * Due censimenti, nessuno dei due scritto a mano:
 *
 *   FASE 20  ogni rotta dichiarata viene aperta e classificata
 *   FASE 21  ogni pulsante con un gestore in linea, su tutta l'applicazione,
 *            deve nominare una funzione che esiste davvero
 *   FASE 22  sui moduli principali i pulsanti si premono uno per uno
 *
 * Sulla FASE 22 una scelta dichiarata: `confirm` risponde **no** e `prompt`
 * risponde niente. Un collaudo che accetta ogni conferma cancella i dati a
 * metà del giro e i comandi successivi falliscono per una ragione che non è
 * loro. Il percorso «annulla» è quello che si verifica, ed è dichiarato qui
 * invece che nascosto: i comandi distruttivi restano NON VERIFICATI nel
 * verso «conferma».
 *
 *   node tests/qa/rotte-e-pulsanti.mjs [file]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const baseline = JSON.parse(fs.readFileSync('baseline/ingly-os.json', 'utf8'));

/* Le rotte che non hanno una schermata perché non devono averla: sono
   comandi, non pagine. Dichiarate qui con il motivo, non dedotte dal fatto
   che siano vuote — altrimenti «vuoto» diventa la definizione di «va bene». */
const VUOTE_PER_SCELTA = {
  briefing: 'apre il briefing del mattino come finestra, non come sezione',
  monthly_report: 'genera un PDF: non ha una schermata propria',
  stockplanner: 'pannello dentro Magazzino, raggiunto dalla sua scheda',
};

/* I moduli su cui gira il laboratorio: qui i pulsanti si premono davvero.
   È una scelta editoriale, non una misura — sta scritta perché si veda. */
const PRINCIPALI = ['dashboard', 'gestione_ordini', 'catalog', 'clients', 'items',
  'quoter', 'print3d', 'laser_b2b', 'equipment', 'settings'];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
/* «annulla» su tutto, tranne sull uscita dalla pagina: rifiutare quella
   bloccherebbe il ricaricamento fra un modulo e l altro. */
page.on('dialog', (d) => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
  window.__rifiuti = [];
  window.addEventListener('unhandledrejection', (e) => {
    /* Il rifiuto porta con sé il pulsante che lo ha prodotto: senza, si sa
       che un modulo rompe una catena asincrona ma non quale comando. */
    window.__rifiuti.push((window.__ultimoPulsante ? '«' + window.__ultimoPulsante + '» → ' : '')
      + String((e.reason && e.reason.message) || e.reason).slice(0, 160));
  });
  /* Gli errori sincroni, con il pulsante che li ha prodotti: la sola cosa
     che permette di risalire da «eu is not defined» al comando da correggere. */
  window.__erroriPulsante = [];
  window.addEventListener('error', (e) => {
    window.__erroriPulsante.push((window.__ultimoPulsante ? '«' + window.__ultimoPulsante + '» → ' : '')
      + String((e.error && e.error.message) || e.message).slice(0, 160));
  });
  /* Dichiarato nell'intestazione: si verifica il percorso «annulla». */
  window.confirm = () => false;
  window.prompt = () => null;
  window.alert = () => {};
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── FASE 20-21 · il giro di tutte le rotte ─────────────────────────────── */
const censimento = await page.evaluate(async (sezioni) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const PAROLE = /^(if|for|while|switch|return|new|typeof|void|delete|try|catch|do|else|function|await|throw|in|of|instanceof)$/;
  const descrivi = (b) => ({
    testo: (b.textContent || b.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    onclick: (b.getAttribute('onclick') || '').slice(0, 120),
  });

  /* Le chiamate che un gestore in linea contiene, prese dal testo del
     gestore: `Modulo.metodo(`, `funzione(`, `a.b.c(`. */
  const chiamate = (on) => {
    /* Le stringhe si tolgono prima: `apri('Corato (BA)')` contiene una
       parentesi che non apre nessuna chiamata, e leggerla come tale
       dichiarerebbe inesistente una funzione di nome «Corato». */
    const senzaStringhe = on
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
    const trovate = [];
    /* Solo l'inizio di una catena: `x.then(`, `.forEach(`, `.click(` sono
       metodi di ciò che li precede, non nomi globali da cercare. */
    const re = /(?:^|[^\w$.)\]])([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/g;
    let m;
    while ((m = re.exec(senzaStringhe))) {
      const espr = m[1].replace(/\s+/g, '');
      if (PAROLE.test(espr.split('.')[0])) continue;
      trovate.push(espr);
      re.lastIndex -= 1;
    }
    return trovate;
  };

  /* Un identificatore dichiarato con `const` in cima al file **non** diventa
     una proprietà di `window`: leggerlo da lì direbbe «non definito» di metà
     dei moduli. Si valuta il nome come lo valuta il gestore in linea, cioè
     nell'ambito globale. */
  const risolviEspressione = (espr) => {
    if (/^(this|event|window\.event)\b/.test(espr) || /\bparentElement\b|\bcloset\b|\bclosest\b|\btarget\b/.test(espr)) {
      return { esiste: null, motivo: 'legato all elemento: non verificabile fuori dal clic' };
    }
    try {
      // eslint-disable-next-line no-new-func
      const tipo = new Function('return typeof (' + espr + ')')();
      if (tipo === 'function') return { esiste: true, motivo: null };
      if (tipo === 'undefined') return { esiste: false, motivo: '«' + espr + '» non è definita' };
      return { esiste: false, motivo: '«' + espr + '» è ' + tipo + ', non una funzione' };
    } catch (e) {
      if (e instanceof ReferenceError) return { esiste: false, motivo: '«' + espr + '» non è definita' };
      return { esiste: null, motivo: 'non valutabile: ' + String(e.message).slice(0, 50) };
    }
  };

  const righe = [];
  for (const sez of sezioni) {
    let stato = 'ok';
    let dettaglio = '';
    try { window.App.navigate(sez); } catch (e) { stato = 'eccezione'; dettaglio = String(e.message).slice(0, 90); }
    await a(160);
    /* Quello che l'utente vede è la vista che diventa attiva, non quella che
       porta il nome della rotta: dopo gli accorpamenti dei mesi scorsi
       parecchie voci sono alias di un modulo unico — `kanban` e
       `workflow_dashboard` aprono entrambe la gestione ordini. Misurare
       `view-<rotta>` direbbe «nascosta» di una schermata che invece si apre. */
    const attive = [...document.querySelectorAll('.section-view.active')];
    const propria = document.getElementById('view-' + sez);
    const vista = attive.length === 1 ? attive[0] : (propria && propria.offsetParent !== null ? propria : attive[0] || propria);
    if (stato !== 'eccezione') {
      if (!vista) stato = 'senza-vista';
      else if (vista.offsetParent === null) stato = 'nascosta';
      else if (vista.id !== 'view-' + sez) { stato = 'alias'; dettaglio = vista.id; }
    }
    const testo = vista ? (vista.innerText || '').trim().length : 0;
    const pulsanti = vista
      ? [...vista.querySelectorAll('button[onclick], [onclick]')].map(descrivi)
      : [];
    const rotti = [];
    const visti = new Set();
    pulsanti.forEach((d) => {
      chiamate(d.onclick).forEach((espr) => {
        const chiave = sez + '|' + espr;
        if (visti.has(chiave)) return;
        visti.add(chiave);
        const r = risolviEspressione(espr);
        if (r.esiste === false) rotti.push(sez + ' · «' + d.testo + '» → ' + r.motivo);
      });
    });
    righe.push({ sez, stato, dettaglio, testo, pulsanti: pulsanti.length, rotti });
  }
  return righe;
}, baseline.sections);

const perStato = (s) => censimento.filter((r) => r.stato === s);
const conContenuto = censimento.filter((r) => r.stato === 'ok' || r.stato === 'alias');
const vuoteReali = conContenuto.filter((r) => r.testo < 120);
const dichiarateVuote = Object.keys(VUOTE_PER_SCELTA);
const senzaVistaNonDichiarate = perStato('senza-vista').filter((r) => !dichiarateVuote.includes(r.sez));
const totalePulsanti = censimento.reduce((a, r) => a + r.pulsanti, 0);
const tuttiRotti = censimento.flatMap((r) => r.rotti);

dico('FASE 20 · tutte le rotte dichiarate sono state aperte (' + censimento.length + ')',
  censimento.length === baseline.sections.length);
dico('FASE 20b · nessuna rotta lancia un eccezione aprendosi ('
  + perStato('eccezione').map((r) => r.sez).join(', ') + ')', perStato('eccezione').length === 0);
dico('FASE 20c · le rotte senza schermata sono solo quelle dichiarate tali ('
  + senzaVistaNonDichiarate.map((r) => r.sez).join(', ') + ')',
  senzaVistaNonDichiarate.length === 0);
dico('FASE 20d · nessuna voce di menu porta a una vista che resta nascosta ('
  + perStato('nascosta').map((r) => r.sez).join(', ') + ')', perStato('nascosta').length === 0);
dico('FASE 20e · gli alias aprono un modulo con contenuto ('
  + perStato('alias').map((r) => r.sez + '→' + r.dettaglio).join(', ') + ')',
  perStato('alias').every((r) => r.testo >= 120));
dico('FASE 21 · i pulsanti dell applicazione si contano dal DOM (' + totalePulsanti + ')',
  totalePulsanti > 300);
dico('FASE 21b · nessun pulsante nomina una funzione che non esiste ('
  + tuttiRotti.slice(0, 6).join(' | ') + ')', tuttiRotti.length === 0);

/* ── FASE 22 · sui moduli principali i pulsanti si premono ──────────────── */
const pressioni = [];
for (const sez of PRINCIPALI) {
  /* Una pagina nuova per ogni modulo: gli effetti di un modulo non devono
     spiegare i guasti del successivo. */
  await page.reload({ waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(12000);
  const esito = await page.evaluate(async (s) => {
    const a = (ms) => new Promise((r) => setTimeout(r, ms));
    window.App.navigate(s);
    await a(2500);
    /* La vista attiva, che per gli alias non porta il nome della rotta. */
    const attiva = [...document.querySelectorAll('.section-view.active')][0];
    const idVista = attiva ? attiva.id : ('view-' + s);
    const vista = () => document.getElementById(idVista);
    if (!vista()) return { sez: s, saltata: 'nessuna vista' };
    const trova = () => [...vista().querySelectorAll('button, [onclick], input[type=button]')]
      .filter((e) => e.offsetParent !== null && !e.disabled);
    const quanti = trova().length;
    const guasti = [];
    const rifiutiPrima = window.__rifiuti.length;
    for (let i = 0; i < quanti; i += 1) {
      const correnti = trova();
      const b = correnti[i];
      if (!b) continue;
      const etichetta = (b.textContent || b.value || '').replace(/\s+/g, ' ').trim().slice(0, 34)
        || (b.getAttribute('onclick') || '').slice(0, 34);
      window.__ultimoPulsante = etichetta;
      try {
        b.click();
      } catch (e) {
        guasti.push('«' + etichetta + '» → ' + String(e.message).slice(0, 80));
      }
      await a(90);
      /* Si richiude quello che si è aperto, senza cancellare i nodi: una
         finestra lasciata aperta coprirebbe i pulsanti successivi. */
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await a(40);
      if (!vista() || vista().offsetParent === null) { window.App.navigate(s); await a(600); }
    }
    await a(700);
    return { sez: s, quanti, guasti, rifiuti: window.__rifiuti.slice(rifiutiPrima),
      erroriPulsante: window.__erroriPulsante.slice(0) };
  }, sez);
  pressioni.push(esito);
  const err = await page.evaluate(() => (window.__rifiuti || []).length);
  esito.rifiutiTotali = err;
}

for (const p of pressioni) {
  if (p.saltata) { dico('FASE 22 · ' + p.sez + ' — saltato (' + p.saltata + ')', false); continue; }
  dico('FASE 22 · ' + p.sez + ': premuti ' + p.quanti + ' pulsanti, nessuna eccezione'
    + (p.guasti.length ? ' — ' + p.guasti.slice(0, 3).join(' | ') : ''), p.guasti.length === 0);
  dico('FASE 22b · ' + p.sez + ': nessuna catena asincrona rotta'
    + (p.rifiuti.length ? ' — ' + p.rifiuti.slice(0, 2).join(' | ') : ''), p.rifiuti.length === 0);
  dico('FASE 22c · ' + p.sez + ': nessun errore JavaScript sotto le dita'
    + ((p.erroriPulsante || []).length ? ' — ' + p.erroriPulsante.slice(0, 3).join(' | ') : ''),
    (p.erroriPulsante || []).length === 0);
}

console.log('\nTUTTE LE ROTTE, TUTTI I PULSANTI\n');
console.log('  rotte aperte           : ' + censimento.length);
console.log('  con contenuto          : ' + (conContenuto.length - vuoteReali.length));
console.log('  alias di un altro modulo: ' + perStato('alias').length
  + (perStato('alias').length ? ' — ' + perStato('alias').map((r) => r.sez + '→' + r.dettaglio).join(' ') : ''));
console.log('  quasi vuote (<120 car.): ' + vuoteReali.length
  + (vuoteReali.length ? ' — ' + vuoteReali.map((r) => r.sez).join(' ') : ''));
console.log('  vuote per scelta       : ' + dichiarateVuote.length
  + ' — ' + dichiarateVuote.join(' '));
console.log('  nascoste               : ' + perStato('nascosta').length);
console.log('  senza vista            : ' + perStato('senza-vista').length);
console.log('  eccezione              : ' + perStato('eccezione').length);
console.log('  pulsanti con gestore   : ' + totalePulsanti + ', premuti sui principali: '
  + pressioni.reduce((a, p) => a + (p.quanti || 0), 0));
if (tuttiRotti.length) {
  console.log('PULSANTI CHE NOMINANO UNA FUNZIONE INESISTENTE (' + tuttiRotti.length + ')');
  tuttiRotti.forEach((r) => console.log('  · ' + r));
  console.log('');
}

const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) {
  console.log('\nERRORI JAVASCRIPT RACCOLTI');
  [...new Set(erroriJS)].slice(0, 12).forEach((e) => console.log('  · ' + e));
}
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nogni rotta si apre e ogni pulsante dei moduli principali risponde ✔\n');
await browser.close();

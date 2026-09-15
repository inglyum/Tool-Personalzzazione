#!/usr/bin/env node
/**
 * admin-primo-avvio.mjs — dalla scatola vuota all'amministratore.
 *
 * Tolta la credenziale scritta nel codice restava una domanda pratica: come
 * entra la prima volta chi installa. La risposta è questa, e va verificata
 * nell'applicazione vera, non a parole:
 *
 *   archivio vuoto → «crea l'account amministratore» → accesso → amministrazione
 *
 * Più le tre cose che rendono il percorso sicuro invece che comodo:
 * la schermata compare una volta sola; un operatore non amministra; e un
 * amministratore non tocca gli utenti di un altro workspace.
 *
 *   node tests/qa/admin-primo-avvio.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── I moduli ───────────────────────────────────────────────────────────── */

const moduli = await page.evaluate(() => ({
  primoAvvio: !!window.InglyPrimoAvvio,
  amministrazione: !!window.InglyAmministrazione,
  sezioni: !!window.InglySezioniSaaS,
  rbac: !!(window.InglyDomain && window.InglyDomain.auth),
}));
dico('il modulo del primo avvio è nel file', moduli.primoAvvio);
dico('la sezione amministrazione pure', moduli.amministrazione);
dico('e le sezioni sono registrate', moduli.sezioni);
dico('il RBAC è quello che esisteva già (InglyDomain.auth)', moduli.rbac);

/* ── Primo avvio ────────────────────────────────────────────────────────── */

const primo = await page.evaluate(() => {
  const S = window.InglyPrimoAvvio;
  const stato = S.serve();
  const login = document.getElementById('gate-login');
  return {
    serve: stato.serve,
    utenti: stato.utenti,
    /* la schermata disegnata deve chiedere di creare, non di accedere */
    chiedeDiCreare: !!(login && /account amministratore/i.test(login.innerText)),
    campi: ['su-lab', 'su-nome', 'su-email', 'su-pass', 'su-conf']
      .filter((id) => !!document.getElementById(id)).length,
  };
});
dico('archivio vuoto: il primo avvio serve (' + primo.utenti + ' utenti)', primo.serve === true);
dico('la schermata chiede di creare l\'account, non di accedere', primo.chiedeDiCreare);
dico('e ha i suoi cinque campi (' + primo.campi + ')', primo.campi === 5);

/* Validazioni, prima di creare davvero. */
const validazioni = await page.evaluate(async () => {
  const S = window.InglyPrimoAvvio;
  const base = { laboratorio: 'Bottega Belice', nome: 'Giuseppe', email: 'g@belice.it' };
  return {
    emailStorta: (await S.crea(Object.assign({}, base, { email: 'non-una-email', password: 'Laboratorio2026' }))).motivo,
    passwordDebole: (await S.crea(Object.assign({}, base, { password: 'abc' }))).motivo,
    nonCoincidono: (await S.crea(Object.assign({}, base, { password: 'Laboratorio2026', conferma: 'Laboratorio2027' }))).motivo,
    senzaLab: (await S.crea({ email: 'g@belice.it', password: 'Laboratorio2026', laboratorio: '' })).motivo,
    ancoraVuoto: S.serve().serve,
  };
});
dico('un\'email storta viene rifiutata: «' + validazioni.emailStorta + '»',
  /email non valid/i.test(validazioni.emailStorta || ''));
dico('una password debole dice che cosa manca', /almeno 8|almeno un numero/i.test(validazioni.passwordDebole));
dico('due password diverse non passano', /non coincidono/i.test(validazioni.nonCoincidono));
dico('un laboratorio senza nome non passa', /nome al tuo laboratorio/i.test(validazioni.senzaLab));
dico('e dopo quattro rifiuti l\'archivio è ancora vuoto', validazioni.ancoraVuoto === true);

/* La creazione vera. */
const creato = await page.evaluate(async () => {
  const S = window.InglyPrimoAvvio;
  const e = await S.crea({
    laboratorio: 'Bottega Belice', nome: 'Giuseppe',
    email: 'Giuseppe@Belice.IT', password: 'Laboratorio2026',
    conferma: 'Laboratorio2026',
  });
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const u = (db.users || [])[0] || {};
  const I = window.InglyIdentita;
  return {
    ok: e.ok,
    email: u.email,
    ruolo: u.ruolo,
    stato: u.status,
    haTenant: !!u.tenant_id,
    tenants: (db.tenants || []).length,
    abbonamenti: (db.subscriptions || []).length,
    pianoAbb: (db.subscriptions || [])[0] && db.subscriptions[0].plan_id,
    statoAbb: (db.subscriptions || [])[0] && db.subscriptions[0].status,
    passwordCifrata: !I.inChiaro(u.password_hash || ''),
    verificaGiusta: (await I.verifica('Laboratorio2026', u.password_hash)).ok,
    verificaSbagliata: (await I.verifica('Laboratorio2027', u.password_hash)).ok,
    servePiu: S.serve().serve,
    secondoTentativo: (await S.crea({ laboratorio: 'X', email: 'x@y.it', password: 'Laboratorio2026' })).motivo,
  };
});
dico('l\'account si crea', creato.ok === true);
dico('l\'email è normalizzata in minuscolo (' + creato.email + ')', creato.email === 'giuseppe@belice.it');
dico('il ruolo è proprietario', creato.ruolo === 'owner');
dico('l\'account è attivo', creato.stato === 'active');
dico('nasce con il suo workspace e il suo abbonamento',
  creato.haTenant && creato.tenants === 1 && creato.abbonamenti === 1);
dico('l\'abbonamento è completo, non una prova di 14 giorni ('
  + creato.pianoAbb + '/' + creato.statoAbb + ')',
  creato.pianoAbb === 'business' && creato.statoAbb === 'active');
dico('la password è cifrata, non in chiaro', creato.passwordCifrata);
dico('e si verifica solo con quella giusta',
  creato.verificaGiusta === true && creato.verificaSbagliata === false);
dico('la schermata di primo avvio non serve più', creato.servePiu === false);
dico('un secondo tentativo viene rifiutato: «' + creato.secondoTentativo + '»',
  /un account/i.test(creato.secondoTentativo || ''));

/* ── Accesso con l'account appena creato ────────────────────────────────── */

const accesso = await page.evaluate(async () => {
  document.getElementById('gate-login').innerHTML = window.InglyLancio.markupAccesso();
  /* markupAccesso() disegna entrambe le schede: si prendono i campi veri. */
  const g = document.getElementById('saas-gate');
  g.innerHTML = window.InglyLancio.markupAccesso();
  document.getElementById('gate-user').value = 'giuseppe@belice.it';
  document.getElementById('gate-pass').value = 'Laboratorio2026';
  await window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 600));
  const s = window.SaaSGate._session;
  const I = window.InglyIdentita;
  return {
    entrato: !!s,
    email: s && s.email,
    ruolo: s && s.ruolo,
    haTenant: !!(s && s.tenant_id),
    senzaDiritti: s ? (!('plan' in s) && !('modules' in s) && !('password_hash' in s)) : false,
    valida: s ? I.sessioneValida(s).ok : false,
  };
});
dico('si entra con email e password appena scelte', accesso.entrato);
dico('la sessione porta il ruolo (' + accesso.ruolo + ') e il workspace',
  accesso.ruolo === 'owner' && accesso.haTenant);
dico('e non porta diritti', accesso.senzaDiritti && accesso.valida);

const sbagliata = await page.evaluate(async () => {
  /* Dopo un accesso riuscito la schermata è nascosta: si ridisegna per avere
     i campi, come li troverebbe chi esce e riprova. */
  const g = document.getElementById('saas-gate');
  g.innerHTML = window.InglyLancio.markupAccesso();
  document.getElementById('gate-user').value = 'giuseppe@belice.it';
  document.getElementById('gate-pass').value = 'sbagliata999';
  await window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 900));
  const e = document.getElementById('gate-err');
  return { msg: e ? (e.textContent || '').trim() : '(elemento assente)',
    visibile: e ? e.style.display !== 'none' : false };
});
dico('una password sbagliata viene respinta con un messaggio neutro: «'
  + sbagliata.msg + '»', sbagliata.visibile && /non corretti/i.test(sbagliata.msg));

/* ── Amministrazione ────────────────────────────────────────────────────── */

const admin = await page.evaluate(async () => {
  const A = window.InglyAmministrazione;
  const s = { user_id: 'usr_x', tenant_id: 'ws_test', ruolo: 'owner' };
  /* La sessione vera è del proprietario: si usa quella dell'archivio. */
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const proprietario = db.users[0];
  const sess = { user_id: proprietario.id, tenant_id: proprietario.tenant_id, ruolo: 'owner' };

  const nuovo = await A.creaUtente({
    nome: 'Maria', email: 'maria@belice.it',
    password: 'Produzione2026', ruolo: 'operator',
  }, { sessione: sess });

  const dopo = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const maria = (dopo.users || []).filter((u) => u.email === 'maria@belice.it')[0];
  const I = window.InglyIdentita;

  /* Un operatore non amministra. */
  const sessOperatore = { user_id: maria && maria.id, tenant_id: proprietario.tenant_id, ruolo: 'operator' };
  const tentativo = await A.creaUtente({ nome: 'X', email: 'x@y.it', password: 'Password2026' },
    { sessione: sessOperatore });

  /* Un amministratore non tocca un altro workspace. */
  const altroWs = A.cambiaRuolo(maria && maria.id, 'viewer',
    { sessione: { user_id: 'z', tenant_id: 'ws_ALTRO', ruolo: 'owner' } });

  /* Nessuno crea un secondo proprietario. */
  const secondoOwner = await A.creaUtente({ nome: 'Y', email: 'y@z.it', password: 'Password2026', ruolo: 'owner' },
    { sessione: sess });

  /* Il proprietario non si sospende, e non ci si sospende da soli. */
  const sospendiOwner = A.cambiaStato(proprietario.id, 'suspended', { sessione: sess });

  /* Cambio ruolo lecito. */
  const cambio = A.cambiaRuolo(maria && maria.id, 'accountant', { sessione: sess });
  const dopoCambio = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const mariaDopo = (dopoCambio.users || []).filter((u) => u.email === 'maria@belice.it')[0];

  return {
    creata: nuovo.ok,
    ruoloMaria: maria && maria.ruolo,
    passwordCifrata: maria ? !I.inChiaro(maria.password_hash || '') : false,
    stessoWorkspace: maria && maria.tenant_id === proprietario.tenant_id,
    operatoreRifiutato: tentativo.ok === false && /permessi/i.test(tentativo.motivo || ''),
    altroWsRifiutato: altroWs.ok === false,
    secondoOwnerRifiutato: secondoOwner.ok === false && /proprietario/i.test(secondoOwner.motivo || ''),
    ownerNonSospendibile: sospendiOwner.ok === false,
    cambioOk: cambio.ok && mariaDopo.ruolo === 'accountant',
    utentiDelWorkspace: A.utenti(proprietario.tenant_id).length,
  };
});
dico('il proprietario può aggiungere una persona', admin.creata);
dico('che nasce operatore, nel suo workspace, con password cifrata',
  admin.ruoloMaria === 'operator' && admin.stessoWorkspace && admin.passwordCifrata);
dico('un operatore NON può aggiungere utenti', admin.operatoreRifiutato);
dico('un amministratore NON tocca un altro workspace', admin.altroWsRifiutato);
dico('non si crea un secondo proprietario', admin.secondoOwnerRifiutato);
dico('il proprietario non si può sospendere', admin.ownerNonSospendibile);
dico('il cambio di ruolo funziona (operator → accountant)', admin.cambioOk);
dico('il workspace ha due persone (' + admin.utentiDelWorkspace + ')', admin.utentiDelWorkspace === 2);

/* ── La schermata ───────────────────────────────────────────────────────── */

const schermata = await page.evaluate(() => {
  const A = window.InglyAmministrazione;
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const prop = db.users[0];
  const host = document.createElement('div');
  document.body.appendChild(host);

  A.render(host, { sessione: { user_id: prop.id, tenant_id: prop.tenant_id, ruolo: 'owner' } });
  const daOwner = host.innerText;

  A.render(host, { sessione: { user_id: 'x', tenant_id: prop.tenant_id, ruolo: 'operator' } });
  const daOperatore = host.innerText;

  host.remove();
  return {
    owner: { persone: /Maria/.test(daOwner), ruoli: /Operatore|Contabile/.test(daOwner),
      aggiungi: /Aggiungi una persona/.test(daOwner) },
    operatore: { riservata: /riservata/i.test(daOperatore), nienteForm: !/Aggiungi una persona/.test(daOperatore) },
  };
});
dico('il proprietario vede le persone, i ruoli e il modulo di aggiunta',
  schermata.owner.persone && schermata.owner.ruoli && schermata.owner.aggiungi);
dico('un operatore vede che la sezione è riservata, e nessun modulo',
  schermata.operatore.riservata && schermata.operatore.nienteForm);

console.log('\nPRIMO AVVIO E AMMINISTRAZIONE\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nla password la sceglie chi installa ✔\n');
await browser.close();

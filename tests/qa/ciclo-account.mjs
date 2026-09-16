#!/usr/bin/env node
/**
 * ciclo-account.mjs — il ciclo di vita dell'account nell'applicazione vera.
 *
 * Questa suite esiste per un difetto misurato: il pulsante «CREA ACCOUNT»
 * restava su «Creazione in corso…» per sempre, l'account veniva creato, e
 * nessuno entrava. Qui si verifica nell'HTML consegnato — non nei moduli
 * isolati — che il percorso completo arrivi in fondo:
 *
 *   primo avvio → account → sessione → dashboard
 *   uscita → rientro → postazione occupata → subentro
 *   sospensione → blocco → nessun accesso di nascosto
 *
 *   node tests/qa/ciclo-account.mjs [file]
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

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const URL = 'file://' + path.resolve(file);
async function apri() {
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(18000);
}
await apri();

/* ── I moduli sono nel file consegnato ──────────────────────────────────── */

const moduli = await page.evaluate(() => ({
  account: !!window.InglyAccount,
  dispositivi: !!window.InglyDispositivi,
  guardia: !!window.InglyGuardia,
  primoAvvio: !!window.InglyPrimoAvvio,
  gate: !!(window.SaaSGate && window.SaaSGate.avviaSessione),
}));
Object.entries(moduli).forEach(([k, v]) => dico('il modulo ' + k + ' è nel file consegnato', v));

/* ── 1 · Primo avvio: si crea l'account e si entra ──────────────────────── */

const inizio = await page.evaluate(() => ({
  setup: !!document.getElementById('su-submit'),
  utenti: (JSON.parse(localStorage.getItem('ingly_saas_db') || '{}').users || []).length,
}));
dico('su un archivio vuoto la schermata chiede di CREARE, non di accedere', inizio.setup);
dico('nessun account preesistente nel prodotto consegnato', inizio.utenti === 0, 'utenti=' + inizio.utenti);

const creazione = await page.evaluate(async () => {
  const t0 = performance.now();
  document.getElementById('su-lab').value = 'Bottega Belice';
  document.getElementById('su-nome').value = 'Giuseppe';
  document.getElementById('su-email').value = 'g@belice.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  let risolto = false;
  const p = window.InglyPrimoAvvio.invia().then(() => { risolto = true; });
  await Promise.race([p, new Promise((r) => setTimeout(r, 15000))]);
  const btn = document.getElementById('su-submit');
  const gate = document.getElementById('saas-gate');
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  return {
    risolto, ms: Math.round(performance.now() - t0),
    etichetta: btn ? btn.textContent : null,
    bloccato: !!(btn && btn.disabled && !risolto),
    gate: gate ? getComputedStyle(gate).display : 'assente',
    utenti: (db.users || []).length,
    tenants: (db.tenants || []).length,
    abbonamenti: (db.subscriptions || []).length,
    dispositivi: (db.device_sessions || []).length,
    audit: (db.audit_log || []).length,
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    guardiaAttiva: !!(window.InglyGuardia && window.InglyGuardia.attiva()),
  };
});
dico('la creazione arriva a una conclusione, non resta appesa', creazione.risolto, creazione.ms + 'ms');
dico('il pulsante NON resta su «Creazione in corso…»', creazione.etichetta !== 'Creazione in corso…',
  String(creazione.etichetta));
dico('il pulsante dichiara l\'esito', creazione.etichetta === 'Account creato', String(creazione.etichetta));
dico('la schermata di accesso si chiude', creazione.gate === 'none', creazione.gate);
dico('esiste una sessione', creazione.sessione);
dico('l\'account è uno solo', creazione.utenti === 1, 'utenti=' + creazione.utenti);
dico('il workspace è stato creato', creazione.tenants === 1);
dico('l\'abbonamento è stato creato', creazione.abbonamenti === 1);
dico('la postazione è stata registrata', creazione.dispositivi === 1);
dico('la creazione ha lasciato una traccia in audit', creazione.audit >= 1);
dico('la guardia è accesa dopo l\'accesso', creazione.guardiaAttiva);

/* ── 2 · Nessun segreto in giro ─────────────────────────────────────────── */

const segreti = await page.evaluate(() => {
  const chiavi = Object.keys(localStorage);
  const tutto = chiavi.map((k) => localStorage.getItem(k) || '').join('\n');
  const sess = sessionStorage.getItem('ingly_saas_session') || '';
  const s = sess ? JSON.parse(sess) : {};
  return {
    passwordInArchivio: tutto.includes('Laboratorio2026'),
    hashInSessione: /password_hash|passwordHash|pbkdf2/.test(sess),
    dirittiInSessione: ['plan', 'modules', 'entitlements', 'expiresAt'].filter((k) => k in s),
    campiSessione: Object.keys(s).sort().join(','),
  };
});
dico('la password non compare in nessuna chiave di localStorage', segreti.passwordInArchivio === false);
dico('la sessione non porta l\'hash della password', segreti.hashInSessione === false);
dico('la sessione non porta diritti', segreti.dirittiInSessione.length === 0,
  segreti.dirittiInSessione.join('|'));

/* ── 3 · La sessione manomessa non apre ─────────────────────────────────── */

const manomessa = await page.evaluate(() => {
  const s = JSON.parse(sessionStorage.getItem('ingly_saas_session') || '{}');
  const falsa = Object.assign({}, s, { plan: 'business', modules: ['*'] });
  const e = window.InglyGuardia.controlla(falsa, {});
  return { azione: e.azione, manomessa: !!e.manomessa };
});
dico('una sessione con un piano scritto a mano viene rifiutata', manomessa.azione === 'esci');
dico('e viene riconosciuta come manomessa', manomessa.manomessa);

/* ── 4 · Una postazione per abbonamento ─────────────────────────────────── */

const postazione = await page.evaluate(() => {
  const s = window.SaaSGate._session;
  const u = window.InglyAccount.perId(s.user_id);
  const conflitto = window.InglyDispositivi.registra(u, { device_id: 'dev_ufficio' });
  const dopo = window.InglyDispositivi.subentra(u, { device_id: 'dev_ufficio' });
  const questa = window.InglyGuardia.controlla(s, {});
  return {
    conflitto: !!conflitto.conflitto,
    diceDove: !!(conflitto.occupate && conflitto.occupate[0] && conflitto.occupate[0].etichetta),
    subentro: !!dopo.ok,
    attive: window.InglyDispositivi.attive(s.user_id).length,
    vecchia: questa.azione,
    causa: questa.causa,
  };
});
dico('un secondo dispositivo non entra di nascosto', postazione.conflitto);
dico('il conflitto dice DA DOVE è aperta l\'altra sessione', postazione.diceDove);
dico('il subentro riesce', postazione.subentro);
dico('resta una sola postazione attiva', postazione.attive === 1, 'attive=' + postazione.attive);
dico('il dispositivo sostituito viene mandato fuori', postazione.vecchia === 'esci');
dico('e sa perché', postazione.causa === 'dispositivo');

/* ── 5 · Sospensione: blocco, non silenzio ──────────────────────────────── */

const sospensione = await page.evaluate(() => {
  const s = window.SaaSGate._session;
  const u = window.InglyAccount.perId(s.user_id);
  /* Si rimette la postazione al dispositivo corrente, per misurare la
     sospensione e non il subentro del passo precedente. */
  window.InglyDispositivi.subentra(u, {});
  const prima = window.InglyGuardia.controlla(
    Object.assign({}, s, { device_id: window.InglyDispositivi.corrente() }), {});
  window.InglyAccount.cambiaStato(u.id, 'suspended', { motivo: 'prova' });
  const dopo = window.InglyGuardia.controlla(
    Object.assign({}, s, { device_id: window.InglyDispositivi.corrente() }), {});
  const html = window.InglyGuardia.schermata(dopo);
  window.InglyAccount.cambiaStato(u.id, 'active', { motivo: 'fine prova' });
  return {
    primaEntrava: prima.azione,
    dopoAzione: dopo.azione, dopoCausa: dopo.causa,
    spiega: !!dopo.messaggio,
    offreUscita: html.includes('InglyGuardia.esci()'),
    nienteRinnovo: !html.includes('Riattiva'),
    nienteSegreti: !/pbkdf2|password_hash/.test(html),
  };
});
dico('prima della sospensione si entrava', sospensione.primaEntrava === 'entra', sospensione.primaEntrava);
dico('un account sospeso viene bloccato', sospensione.dopoAzione === 'blocco');
dico('e la causa è l\'account, non l\'abbonamento', sospensione.dopoCausa === 'account');
dico('il blocco spiega che cosa è successo', sospensione.spiega);
dico('il blocco offre comunque un\'uscita', sospensione.offreUscita);
dico('a un account sospeso non si vende un rinnovo', sospensione.nienteRinnovo);
dico('la schermata non espone dettagli interni', sospensione.nienteSegreti);

/* ── 6 · Abbonamento scaduto: si resta, per poter rinnovare ─────────────── */

const scadenza = await page.evaluate(() => {
  const s = window.SaaSGate._session;
  const db = JSON.parse(localStorage.getItem('ingly_saas_db'));
  const ieri = new Date(Date.now() - 2 * 86400000).toISOString();
  const orig = JSON.stringify(db.subscriptions);
  db.subscriptions.forEach((x) => {
    x.trial_end = ieri; x.current_period_end = ieri; x.status = 'expired';
  });
  localStorage.setItem('ingly_saas_db', JSON.stringify(db));
  const e = window.InglyGuardia.controlla(
    Object.assign({}, s, { device_id: window.InglyDispositivi.corrente() }), {});
  const html = window.InglyGuardia.schermata(e);
  db.subscriptions = JSON.parse(orig);
  localStorage.setItem('ingly_saas_db', JSON.stringify(db));
  return {
    azione: e.azione, causa: e.causa,
    offreRinnovo: html.includes('Riattiva'),
  };
});
dico('un abbonamento scaduto blocca', scadenza.azione === 'blocco', scadenza.azione);
dico('la causa è l\'abbonamento', scadenza.causa === 'abbonamento');
dico('chi deve rinnovare può farlo dalla schermata di blocco', scadenza.offreRinnovo);

/* ── 7 · Uscita e rientro con la password giusta ────────────────────────── */

await page.evaluate(() => window.SaaSGate.logout());
await page.waitForTimeout(600);
const dopoUscita = await page.evaluate(() => ({
  gate: (() => { const g = document.getElementById('saas-gate'); return g ? getComputedStyle(g).display : 'assente'; })(),
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  guardia: !!(window.InglyGuardia && window.InglyGuardia.attiva()),
  postazioni: window.InglyDispositivi.attive(
    (JSON.parse(localStorage.getItem('ingly_saas_db')).users[0] || {}).id).length,
  campoUtente: !!document.getElementById('gate-user'),
}));
dico('l\'uscita riporta alla schermata di accesso', dopoUscita.gate === 'flex', dopoUscita.gate);
dico('l\'uscita cancella la sessione', dopoUscita.sessione === false);
dico('l\'uscita spegne la guardia', dopoUscita.guardia === false);
dico('l\'uscita libera la postazione', dopoUscita.postazioni === 0, 'attive=' + dopoUscita.postazioni);
dico('la schermata di accesso ha di nuovo i suoi campi', dopoUscita.campoUtente);

const rientro = await page.evaluate(async () => {
  document.getElementById('gate-user').value = 'g@belice.it';
  document.getElementById('gate-pass').value = 'Laboratorio2026';
  window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 2500));
  const gate = document.getElementById('saas-gate');
  return {
    gate: gate ? getComputedStyle(gate).display : 'assente',
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    errore: (document.getElementById('gate-err') || {}).textContent || '',
    bottone: (document.getElementById('gate-submit') || {}).disabled,
  };
});
dico('si rientra con la password giusta', rientro.sessione && rientro.gate === 'none',
  rientro.errore || rientro.gate);
dico('il pulsante di accesso non resta spento', rientro.bottone === false);

const sbagliata = await page.evaluate(async () => {
  window.SaaSGate.logout();
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('gate-user').value = 'g@belice.it';
  document.getElementById('gate-pass').value = 'Sbagliata2026';
  window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 2500));
  return {
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    errore: (document.getElementById('gate-err') || {}).textContent || '',
    bottone: (document.getElementById('gate-submit') || {}).disabled,
  };
});
dico('la password sbagliata non entra', sbagliata.sessione === false);
dico('e il messaggio non rivela se l\'account esiste', /non corretti/i.test(sbagliata.errore),
  sbagliata.errore);
dico('il pulsante torna utilizzabile dopo un errore', sbagliata.bottone === false);

/* ── 8 · Il rientro dopo una ricarica ───────────────────────────────────── */

const persistenza = await page.evaluate(async () => {
  document.getElementById('gate-user').value = 'g@belice.it';
  document.getElementById('gate-pass').value = 'Laboratorio2026';
  window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 2500));
  return { dentro: !!window.SaaSGate._session };
});
dico('si rientra per preparare la ricarica', persistenza.dentro);

await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(16000);
const dopoRicarica = await page.evaluate(() => ({
  utenti: (JSON.parse(localStorage.getItem('ingly_saas_db') || '{}').users || []).length,
  setup: !!document.getElementById('su-submit'),
  gate: (() => { const g = document.getElementById('saas-gate'); return g ? getComputedStyle(g).display : 'assente'; })(),
}));
dico('l\'account sopravvive alla ricarica', dopoRicarica.utenti === 1, 'utenti=' + dopoRicarica.utenti);
dico('la schermata di primo avvio NON si ripresenta', dopoRicarica.setup === false);

/* ── 9 · Sicurezza: la password la cambia chi la possiede ──────────────── */

const sicurezza = await page.evaluate(async () => {
  const host = document.createElement('div');
  host.id = 'view-sicurezza';
  document.body.appendChild(host);
  window.InglySicurezza.render(host);
  const campi = ['sic-attuale', 'sic-nuova', 'sic-conferma', 'sic-submit']
    .filter((id) => !!document.getElementById(id));
  const parlaDelRecupero = /servizio di posta/i.test(host.textContent);

  document.getElementById('sic-attuale').value = 'Laboratorio2026';
  document.getElementById('sic-nuova').value = 'Bottega2027';
  document.getElementById('sic-conferma').value = 'Bottega2027';
  const e = await window.InglySicurezza.cambia();
  const btn = document.getElementById('sic-submit');
  return {
    campi: campi.length,
    parlaDelRecupero,
    cambiata: !!(e && e.ok),
    motivo: (e && e.motivo) || null,
    bottone: btn ? btn.disabled : null,
    etichetta: btn ? btn.textContent : null,
    mostraDispositivi: /Dove sei connesso/.test(host.textContent),
  };
});
dico('la sezione Sicurezza ha i suoi campi', sicurezza.campi === 4, 'campi=' + sicurezza.campi);
dico('dice la verità sul recupero password', sicurezza.parlaDelRecupero);
dico('mostra da dove si è connessi', sicurezza.mostraDispositivi);
dico('la password si cambia dalla propria sezione', sicurezza.cambiata, sicurezza.motivo);
dico('il pulsante non resta spento dopo il cambio', sicurezza.bottone === false,
  String(sicurezza.etichetta));

const dopoCambio = await page.evaluate(async () => {
  const sbagliata = await window.InglyAccount.cambiaPassword(
    window.SaaSGate._session.user_id, 'Laboratorio2026', 'Altra2028aa');
  return {
    vecchiaRifiutata: sbagliata.ok === false,
    archivioPulito: !(localStorage.getItem('ingly_saas_db') || '').includes('Bottega2027'),
  };
});
dico('la password vecchia non vale più', dopoCambio.vecchiaRifiutata);
dico('la password nuova non compare in archivio', dopoCambio.archivioPulito);

/* ── 10 · Amministrazione: persone, postazioni, attività ────────────────── */

const admin = await page.evaluate(async () => {
  const host = document.createElement('div');
  host.id = 'view-amministrazione';
  document.body.appendChild(host);
  const nuovo = await window.InglyAmministrazione.creaUtente({
    nome: 'Rosa', email: 'rosa@belice.it', password: 'Laboratorio2026', ruolo: 'operator',
  });
  window.InglyAmministrazione.render(host);
  const db = JSON.parse(localStorage.getItem('ingly_saas_db'));
  const t = host.textContent;
  return {
    aggiunta: !!nuovo.ok, motivo: nuovo.motivo || null,
    stessoWorkspace: nuovo.ok && nuovo.utente.tenant_id === window.SaaSGate._session.tenant_id,
    workspaceUnici: new Set((db.tenants || []).map((x) => x.id)).size,
    abbonamenti: (db.subscriptions || []).length,
    mostraPersone: /Rosa/.test(t),
    mostraPostazioni: /Postazioni aperte/.test(t),
    mostraAttivita: /Attività recente/.test(t),
    nienteHash: !/pbkdf2/.test(host.innerHTML),
  };
});
dico('l\'amministratore aggiunge una persona', admin.aggiunta, admin.motivo);
dico('la persona entra nello stesso workspace', admin.stessoWorkspace);
dico('non nasce un secondo workspace', admin.workspaceUnici === 1, 'workspace=' + admin.workspaceUnici);
dico('non nasce un secondo abbonamento', admin.abbonamenti === 1, 'abbonamenti=' + admin.abbonamenti);
dico('la schermata elenca le persone', admin.mostraPersone);
dico('la schermata mostra le postazioni aperte', admin.mostraPostazioni);
dico('la schermata mostra l\'attività recente', admin.mostraAttivita);
dico('la schermata non stampa hash di password', admin.nienteHash);

/* ── Esito ──────────────────────────────────────────────────────────────── */

console.log('\nCICLO DI VITA DELL\'ACCOUNT · REGISTRAZIONE, POSTAZIONE, BLOCCO, RIENTRO\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
  if (!p.esito) problemi.push(p.passo + (p.dettaglio ? ' [' + p.dettaglio + ']' : ''));
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
console.log('\nnessun pulsante bloccato, nessuna sessione senza fine ✔\n');
await browser.close();

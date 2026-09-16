#!/usr/bin/env node
/**
 * admin-console-accesso.mjs — si entra davvero nel pannello amministrazione?
 *
 * Questa suite nasce da un difetto segnalato e riprodotto: la console mostrava
 * una schermata di accesso che **non poteva accettare nessuno**. Non era una
 * password sbagliata — l'elenco degli amministratori era vuoto.
 *
 * La causa: il pannello condivide l'archivio con l'applicazione (stessa chiave
 * `ingly_saas_db`). Appena qualcuno crea il proprio account nell'applicazione
 * l'archivio esiste, `createDB()` non viene più eseguito, e il super
 * amministratore non nasce mai.
 *
 * Qui si percorre la strada intera, due volte: su archivio vuoto e su archivio
 * già creato dall'applicazione — che è il caso in cui il difetto si
 * manifestava.
 *
 *   node tests/qa/admin-console-accesso.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

/* Questa suite collauda il pannello, non l'applicazione. Il lanciatore della
   regressione passa a tutte lo stesso file: se non è quello del pannello, si
   usa il proprio. */
const passato = process.argv[2];
const file = (passato && /ADMIN/i.test(passato)) ? passato : 'dist/INGLY-CLOUD-ADMIN.html';
const url = 'file://' + path.resolve(file);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });
const erroriJS = [];

async function nuovaPagina(preparazione) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  if (preparazione) await page.addInitScript(preparazione);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);
  return { page, ctx };
}

/* ── La schermata non promette più credenziali inesistenti ──────────────── */

{
  const { page, ctx } = await nuovaPagina();
  const schermo = await page.evaluate(() => ({
    testo: (document.body.innerText || '').replace(/\s+/g, ' '),
    bottoni: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()),
  }));
  dico('la schermata non mostra più una password predefinita',
    !/Password:\s*admin/i.test(schermo.testo) && !/Credenziali predefinite/i.test(schermo.testo));
  dico('e non c\'è più il pulsante che le inseriva da solo',
    !schermo.bottoni.some((b) => /credenziali predefinite/i.test(b)));
  dico('spiega invece che la password la si sceglie al primo accesso',
    /Primo accesso/i.test(schermo.testo) && /a tua scelta/i.test(schermo.testo));
  await ctx.close();
}

/* ── Archivio vuoto: il super amministratore esiste e non ha password ───── */

{
  const { page, ctx } = await nuovaPagina();
  const stato = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const a = (db.admins || [])[0] || null;
    return {
      quanti: (db.admins || []).length,
      username: a && a.username,
      senzaPassword: a ? a.passwordHash === null : false,
      deveCambiare: a ? a.mustChangePassword === true : false,
      attivo: a ? a.active === true : false,
    };
  });
  dico('archivio vuoto: nasce un amministratore (' + stato.quanti + ')', stato.quanti === 1);
  dico('si chiama superadmin', stato.username === 'superadmin');
  dico('e nasce SENZA password', stato.senzaPassword);
  dico('con l\'obbligo di impostarla, che non viene più azzerato al caricamento',
    stato.deveCambiare);
  await ctx.close();
}

/* ── Il caso del difetto: archivio già creato dall'applicazione ─────────── */

const archivioApp = () => {
  localStorage.setItem('ingly_saas_db', JSON.stringify({
    users: [{ id: 'usr_1', email: 'giuseppe@belice.it', tenant_id: 'ws_1', ruolo: 'owner',
      status: 'active', password_hash: 'pbkdf2$210000$AAAA$BBBB' }],
    tenants: [{ id: 'ws_1', nome: 'Bottega Belice' }],
    subscriptions: [{ tenant_id: 'ws_1', plan_id: 'business', status: 'active' }],
  }));
};

{
  const { page, ctx } = await nuovaPagina(archivioApp);
  const stato = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const a = (db.admins || [])[0] || null;
    return {
      quanti: (db.admins || []).length,
      senzaPassword: a ? a.passwordHash === null : false,
      /* L'archivio dell'applicazione non deve essere stato toccato. */
      utentiApp: (db.users || []).length,
      workspace: (db.tenants || []).length,
      abbonamenti: (db.subscriptions || []).length,
    };
  });
  dico('archivio già creato dall\'app: l\'amministratore nasce lo stesso ('
    + stato.quanti + ')', stato.quanti === 1);
  dico('e nasce senza password, come deve', stato.senzaPassword);
  dico('senza toccare utenti, workspace e abbonamenti dell\'applicazione',
    stato.utentiApp === 1 && stato.workspace === 1 && stato.abbonamenti === 1);
  await ctx.close();
}

/* ── Il percorso intero, e il ritorno il giorno dopo ────────────────────────
   Un solo contesto per tutto: l'archivio deve sopravvivere al ricaricamento,
   come sopravvive sul computer di chi usa il pannello. Aprire una pagina nuova
   ogni volta misurerebbe sempre il primo accesso, che non è la domanda. */

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  /* La preparazione vale per la prima apertura soltanto. Metterla sul
     contesto la rieseguirebbe a ogni ricaricamento, riscrivendo l'archivio e
     cancellando l'amministratore: misurerei il mio stesso collaudo. */
  await page.addInitScript(archivioApp);
  page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);

  const primo = await page.evaluate(async () => {
    document.getElementById('l-user').value = 'superadmin';
    document.getElementById('l-pass').value = 'qualunque';
    await doLogin();
    await new Promise((r) => setTimeout(r, 900));
    return {
      chiedePassword: !!document.getElementById('fl-pwd1'),
      testo: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
    };
  });
  dico('al primo accesso chiede di impostare la password', primo.chiedePassword);
  dico('e lo dice chiaramente', /PRIMO ACCESSO|Imposta la tua password/i.test(primo.testo));

  const debole = await page.evaluate(async () => {
    document.getElementById('fl-pwd1').value = 'corta';
    document.getElementById('fl-pwd2').value = 'corta';
    await _doFirstLogin();
    await new Promise((r) => setTimeout(r, 500));
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    return { ancoraSenzaPassword: (db.admins || [])[0].passwordHash === null,
      err: (document.getElementById('fl-err') || {}).textContent || '' };
  });
  dico('una password debole viene rifiutata e non viene salvata',
    debole.ancoraSenzaPassword);

  const impostata = await page.evaluate(async () => {
    document.getElementById('fl-pwd1').value = 'Amministra2026';
    document.getElementById('fl-pwd2').value = 'Amministra2026';
    await _doFirstLogin();
    await new Promise((r) => setTimeout(r, 1400));
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const a = (db.admins || [])[0] || {};
    return {
      hash: String(a.passwordHash || ''),
      deveAncoraCambiare: a.mustChangePassword === true,
      dentro: (function () {
        var ls = document.getElementById('login-screen');
        var nascosto = !ls || getComputedStyle(ls).display === 'none';
        return nascosto && /Benvenuto|Dashboard/i.test(document.body.innerText || '');
      }()),
      utentiApp: (db.users || []).length,
    };
  });
  dico('la password si imposta e viene cifrata (' + impostata.hash.slice(0, 16) + '…)',
    impostata.hash.length > 20 && impostata.hash.indexOf('Amministra2026') < 0);
  dico('l\'obbligo di cambiarla si spegne solo dopo averla impostata',
    impostata.deveAncoraCambiare === false);
  dico('e si entra nella console', impostata.dentro);
  dico('i dati dell\'applicazione sono intatti', impostata.utentiApp === 1);

  /* Il giorno dopo: si ricarica la pagina, l'archivio è quello di prima. */
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
  page2.on('dialog', (d) => d.accept().catch(() => {}));
  await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page2.waitForTimeout(9000);

  const ritorno = await page2.evaluate(async () => {
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const a = (db.admins || [])[0] || {};
    const chiedeAncora = !!document.getElementById('fl-pwd1');
    document.getElementById('l-user').value = 'superadmin';
    document.getElementById('l-pass').value = 'Amministra2026';
    await doLogin();
    await new Promise((r) => setTimeout(r, 1200));
    return {
      passwordConservata: String(a.passwordHash || '').length > 20,
      chiedeAncora: chiedeAncora,
      dentro: (function () {
        var ls = document.getElementById('login-screen');
        var nascosto = !ls || getComputedStyle(ls).display === 'none';
        return nascosto && /Benvenuto|Dashboard/i.test(document.body.innerText || '');
      }()),
    };
  });
  dico('ricaricando, la password resta salvata', ritorno.passwordConservata);
  dico('e la schermata di primo accesso NON si ripresenta', ritorno.chiedeAncora === false);
  dico('si rientra con la password scelta', ritorno.dentro);

  const page3 = await ctx.newPage();
  page3.on('dialog', (d) => d.accept().catch(() => {}));
  await page3.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page3.waitForTimeout(9000);
  const sbagliata = await page3.evaluate(async () => {
    document.getElementById('l-user').value = 'superadmin';
    document.getElementById('l-pass').value = 'Amministra2027';
    await doLogin();
    await new Promise((r) => setTimeout(r, 1200));
    var ls = document.getElementById('login-screen');
    return {
      dentro: (!ls || getComputedStyle(ls).display === 'none')
        && /Benvenuto|Dashboard/i.test(document.body.innerText || ''),
      messaggio: ((document.getElementById('l-err') || {}).textContent || '').trim(),
    };
  });
  dico('con una password sbagliata NON si entra', sbagliata.dentro === false);
  dico('e il messaggio lo dice: «' + sbagliata.messaggio + '»',
    /non valid/i.test(sbagliata.messaggio));

  await ctx.close();
}

/* ── L'app e la console condividono l'archivio: non devono calpestarsi ──── */

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);

  const esito = await page.evaluate(() => {
    /* La console ha seminato il suo amministratore. Ora si simula quello che
       fa l'applicazione al primo avvio: scrivere utenti, workspace e
       abbonamento nello **stesso** archivio. */
    const prima = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const adminPrima = (prima.admins || []).length;

    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    db.users = [{ id: 'usr_1', email: 'g@belice.it', tenant_id: 'ws_1', ruolo: 'owner' }];
    db.tenants = [{ id: 'ws_1', nome: 'Bottega Belice' }];
    db.subscriptions = [{ tenant_id: 'ws_1', plan_id: 'business', status: 'active' }];
    localStorage.setItem('ingly_saas_db', JSON.stringify(db));

    const dopo = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    return { adminPrima, adminDopo: (dopo.admins || []).length,
      utenti: (dopo.users || []).length };
  });
  dico('la console semina il suo amministratore (' + esito.adminPrima + ')', esito.adminPrima === 1);
  dico('e l\'applicazione, scrivendo nello stesso archivio, non lo cancella ('
    + esito.adminDopo + ')', esito.adminDopo === 1 && esito.utenti === 1);
  await ctx.close();
}

/* ── «Problemi di accesso? Reset database»: DEVE azzerare solo l'admin ─────
   Difetto misurato: il pulsante offerto a chi non riesce a entrare
   cancellava `DB_KEY`, che è la STESSA chiave dell'applicazione
   (`ingly_saas_db`). Un pulsante pensato per sbloccare la console
   distruggeva l'account, il workspace e l'abbonamento di chi la stava
   usando in quello stesso browser — perché `file://` condivide un'unica
   origine fra tutti i file locali, e con essa lo `localStorage`. */

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(archivioApp);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);

  const prima = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    return { utenti: (db.users || []).length, workspace: (db.tenants || []).length,
      abbonamenti: (db.subscriptions || []).length, admins: (db.admins || []).length };
  });

  /* Il vero pulsante, il vero clic — non una simulazione della funzione. */
  await page.click('button:has-text("Reset database")');
  await page.waitForTimeout(1200);

  const dopo = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
    const a = (db.admins || [])[0] || {};
    return {
      utenti: (db.users || []).length, workspace: (db.tenants || []).length,
      abbonamenti: (db.subscriptions || []).length,
      admins: (db.admins || []).length,
      adminSenzaPassword: a.passwordHash === null,
      chiedePrimoAccesso: document.body.innerText.includes('Nessuna password è preconfigurata'),
    };
  });
  dico('prima del reset: l\'app ha già account, workspace e abbonamento',
    prima.utenti === 1 && prima.workspace === 1 && prima.abbonamenti === 1);
  dico('«Reset database» NON cancella l\'account dell\'applicazione ('
    + dopo.utenti + ')', dopo.utenti === 1);
  dico('né il workspace (' + dopo.workspace + ')', dopo.workspace === 1);
  dico('né l\'abbonamento (' + dopo.abbonamenti + ')', dopo.abbonamenti === 1);
  dico('e azzera davvero l\'accesso admin: un solo amministratore, senza password',
    dopo.admins === 1 && dopo.adminSenzaPassword);
  dico('la schermata torna al primo accesso, pronta per una password nuova',
    dopo.chiedePrimoAccesso);

  /* E il prodotto, riaperto, vede ancora il proprio account. */
  const pOS = await ctx.newPage();
  pOS.on('dialog', (d) => d.accept().catch(() => {}));
  await pOS.goto('file://' + path.resolve('dist/INGLY-OS.html'), { waitUntil: 'load', timeout: 120000 });
  await pOS.waitForTimeout(16000);
  const lato_os = await pOS.evaluate(() => ({
    utenti: (JSON.parse(localStorage.getItem('ingly_saas_db') || '{}').users || []).length,
    chiedeDiCreare: !!document.getElementById('su-submit'),
  }));
  dico('e dal lato dell\'applicazione l\'account è ancora lì (' + lato_os.utenti + ')',
    lato_os.utenti === 1);
  dico('non ripropone la creazione dell\'account', lato_os.chiedeDiCreare === false);

  await ctx.close();
}

/* ── Il campo password non arriva più precompilato ──────────────────────
   Difetto misurato: `l-pass` veniva riempito con la stringa 'admin' a ogni
   apertura — un residuo dello stesso bypass rimosso dal resto del file. Chi
   non lo cancellava per intero prima di scrivere la propria password inviava
   'admin' più quello che aveva digitato, e il login falliva in un modo che
   da uno screenshot sembrava «password sbagliata». */

{
  const { page, ctx } = await nuovaPagina();
  const valore = await page.evaluate(() => document.getElementById('l-pass').value);
  dico('il campo password è vuoto all\'apertura, non precompilato', valore === '');
  await ctx.close();
}

/* ── Il logo della console: si carica, si vede ovunque, sopravvive ──────── */

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(archivioApp);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);

  const senzaLogo = await page.evaluate(() => ({
    loginBox: (document.getElementById('lc-logo-box') || {}).innerHTML || '',
  }));
  dico('senza logo caricato si vede l\'icona predefinita', senzaLogo.loginBox.includes('🎨'));

  await page.fill('#l-user', 'superadmin');
  await page.fill('#l-pass', 'Amministra2026');
  await page.click('button:has-text("Accedi")');
  await page.waitForTimeout(900);
  await page.fill('#fl-pwd1', 'Amministra2026');
  await page.fill('#fl-pwd2', 'Amministra2026');
  await page.click('button:has-text("Imposta Password e Accedi")');
  await page.waitForTimeout(1500);

  /* Un file che non è un'immagine viene rifiutato. */
  const fileRifiutato = await page.evaluate(() => {
    const bytes = new TextEncoder().encode('non è un\'immagine');
    const file = new File([bytes], 'nota.txt', { type: 'text/plain' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type=file][accept*="image"]');
    if (!input) return { inputAssente: true };
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { inputAssente: false, salvato: !!localStorage.getItem('ingly_admin_logo') };
  });
  dico('un file che non è un\'immagine viene rifiutato', fileRifiutato.salvato === false);

  /* Un PNG vero: si carica, e compare in tutti i punti dichiarati. */
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const dopoCarico = await page.evaluate(async (b64) => {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const file = new File([arr], 'logo.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type=file][accept*="image"]');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const g = (id) => { const e = document.getElementById(id); return e ? e.innerHTML : ''; };
    return { topbar: g('tb-logo-box'), anteprima: g('logo-settings-preview') };
  }, pngBase64);
  dico('caricato, compare subito nell\'intestazione', dopoCarico.topbar.includes('<img'));
  dico('e nell\'anteprima delle impostazioni', dopoCarico.anteprima.includes('<img'));

  /* Un'altra pagina, un altro accesso: il logo è già lì, prima ancora di
     entrare — perché non vive nella sessione, vive nel browser. */
  const page2 = await ctx.newPage();
  page2.on('dialog', (d) => d.accept().catch(() => {}));
  await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page2.waitForTimeout(9000);
  const primaDiAccedere = await page2.evaluate(() => ({
    loginBox: (document.getElementById('lc-logo-box') || {}).innerHTML || '',
    schermataVisibile: getComputedStyle(document.getElementById('login-screen')).display,
  }));
  dico('il logo si vede nella schermata di accesso, prima del login',
    primaDiAccedere.loginBox.includes('<img') && primaDiAccedere.schermataVisibile !== 'none');

  /* Si torna all'icona predefinita: sparisce ovunque, e l'archivio è pulito. */
  const dopoRimozione = await page2.evaluate(async () => {
    document.getElementById('l-user').value = 'superadmin';
    document.getElementById('l-pass').value = 'Amministra2026';
    await doLogin();
    await new Promise((r) => setTimeout(r, 1000));
    nav('cloud-settings');
    await new Promise((r) => setTimeout(r, 400));
    removeAdminLogo();
    await new Promise((r) => setTimeout(r, 300));
    const g = (id) => { const e = document.getElementById(id); return e ? e.innerHTML : ''; };
    return { topbar: g('tb-logo-box'), anteprima: g('logo-settings-preview'),
      storage: localStorage.getItem('ingly_admin_logo') };
  });
  dico('«torna all\'icona predefinita» toglie l\'immagine dall\'intestazione',
    dopoRimozione.topbar.includes('🎨') && !dopoRimozione.topbar.includes('<img'));
  dico('e dall\'anteprima', dopoRimozione.anteprima.includes('🎨'));
  dico('e libera l\'archivio', dopoRimozione.storage === null);

  await ctx.close();
}

console.log('\nCONSOLE AMMINISTRAZIONE · ACCESSO\n');
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
console.log('\nsi entra, e solo con la propria password ✔\n');
await browser.close();

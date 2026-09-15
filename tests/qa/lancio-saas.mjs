#!/usr/bin/env node
/**
 * lancio-saas.mjs — la porta d'ingresso, il listino, l'abbonamento.
 *
 * Quattro porte erano aperte e questa suite verifica che restino chiuse
 * nell'applicazione vera, non solo nei test di unità:
 *
 *   · nessuna credenziale scritta nel prodotto;
 *   · nessuna password in chiaro in archivio;
 *   · una sessione modificata a mano non concede un piano;
 *   · una funzione non compresa nel piano non parte nemmeno chiamandola
 *     direttamente, senza passare dal pulsante.
 *
 *   node tests/qa/lancio-saas.mjs [file]
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
  piani: !!window.InglyPiani,
  abbonamento: !!window.InglyAbbonamento,
  entitlements: !!window.InglyEntitlements,
  identita: !!window.InglyIdentita,
  lancio: !!window.InglyLancio,
  gate: !!window.SaaSGate,
}));
Object.entries(moduli).forEach(([k, v]) => dico('il modulo ' + k + ' è nel file consegnato', v));

/* ── SICUREZZA · nessuna credenziale nel prodotto ───────────────────────── */

const sicurezza = await page.evaluate(() => {
  let db = {};
  try { db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}'); } catch (e) {}
  const utenti = db.users || [];
  const I = window.InglyIdentita;
  return {
    utenti: utenti.length,
    owner: utenti.filter((u) => u.username === 'owner' || u.id === 'standalone-owner').length,
    inChiaro: utenti.filter((u) => I && I.inChiaro(u.password_hash || u.passwordHash || '')).length,
    conStellina: utenti.filter((u) => Array.isArray(u.modules) && u.modules.indexOf('*') >= 0).length,
    lifetime: utenti.filter((u) => u.status === 'lifetime').length,
    seedAttivo: localStorage.getItem('ingly_dev_seed'),
  };
});
dico('nessun utente seminato all\'avvio (' + sicurezza.utenti + ')', sicurezza.utenti === 0);
dico('nessun account «owner» scritto nel prodotto', sicurezza.owner === 0);
dico('nessuna password in chiaro in archivio', sicurezza.inChiaro === 0);
dico('nessun account con moduli «*»', sicurezza.conStellina === 0);
dico('nessuna licenza «lifetime» preconfezionata', sicurezza.lifetime === 0);
dico('il seed di sviluppo è spento di default', !sicurezza.seedAttivo);

/* La credenziale storica non deve funzionare. */
const backdoor = await page.evaluate(async () => {
  const I = window.InglyIdentita;
  return {
    inChiaroRifiutata: !(await I.verifica('standalone', 'standalone')).ok,
    hashFinto: !(await I.verifica('standalone', 'pbkdf2$1000$AAAA$BBBB')).ok,
  };
});
dico('la vecchia password «standalone» non è più accettabile', backdoor.inChiaroRifiutata);
dico('né un hash inventato', backdoor.hashFinto);

/* ── SICUREZZA · la sessione non concede diritti ────────────────────────── */

const sessione = await page.evaluate(() => {
  const I = window.InglyIdentita;
  const buona = I.creaSessione({ id: 'u1', email: 'a@b.it', tenant_id: 't1' });
  const manomessa = Object.assign({}, buona, { plan: 'business', modules: ['*'] });
  return {
    campi: Object.keys(buona).join(','),
    senzaDiritti: !('plan' in buona) && !('modules' in buona) && !('passwordHash' in buona),
    manomessaRifiutata: I.sessioneValida(manomessa).ok === false,
    senzaTenant: I.sessioneValida({ user_id: 'u', scade: '2099-01-01' }).ok === false,
    senzaScadenza: I.sessioneValida({ user_id: 'u', tenant_id: 't' }).ok === false,
  };
});
dico('la sessione non contiene diritti (' + sessione.campi + ')', sessione.senzaDiritti);
dico('una sessione a cui si aggiunge un piano viene rifiutata', sessione.manomessaRifiutata);
dico('una sessione senza workspace non vale', sessione.senzaTenant);
dico('una sessione senza scadenza non vale', sessione.senzaScadenza);

/* ── PIANI · il listino nell'applicazione vera ──────────────────────────── */

const listino = await page.evaluate(() => {
  const P = window.InglyPiani;
  return {
    piani: P.elenco().map((p) => p.id).join('|'),
    prezzi: ['standard', 'premium', 'business'].map((id) =>
      P.prezzo(id, 'monthly').amount + '/' + P.prezzo(id, 'yearly').amount).join(' '),
    risparmi: ['standard', 'premium', 'business'].map((id) =>
      P.risparmioAnnuale(id).mesiRegalati).join(','),
    badge: P.piano('premium').badge,
  };
});
dico('i tre piani (' + listino.piani + ')', listino.piani === 'standard|premium|business');
dico('i prezzi del listino (' + listino.prezzi + ')', listino.prezzi === '19/190 39/390 79/790');
dico('«due mesi» è vero per tutti e tre (' + listino.risparmi + ')', listino.risparmi === '2,2,2');
dico('Premium porta il badge «' + listino.badge + '»', listino.badge === 'Più scelto');

/* ── ENTITLEMENT · una funzione bloccata non parte comunque ─────────────── */

const diritti = await page.evaluate(() => {
  const S = window.InglyAbbonamento;
  const E = window.InglyEntitlements;
  const std = { abbonamento: S.creaAttivo('standard', 'monthly'), utilizzo: { orders_month: 99 } };
  const prem = { abbonamento: S.creaAttivo('premium', 'monthly'), utilizzo: { orders_month: 99 } };
  const fuori = { abbonamento: S.creaTrial({ adesso: Date.now() - 100 * 86400000 }) };

  /* Il punto chiave: si chiama il motore direttamente, come farebbe qualcuno
     che abbia tolto il pulsante dalla schermata. */
  E.usaContesto(std);
  const diretto = E.require('production');
  E.usaContesto(null);

  return {
    stdProduzione: E.can('production', std).ok,
    premProduzione: E.can('production', prem).ok,
    stdApi: E.can('api', std).ok,
    fuoriCrm: E.can('crm', fuori).ok,
    fuoriDashboard: E.can('dashboard', fuori).ok,
    direttoBloccato: diretto.ok === false && diretto.bloccato === true,
    messaggio: E.can('production', std).motivo,
    limite99: E.limit('orders_month', std).entro,
    limite100: E.limit('orders_month', { abbonamento: std.abbonamento, utilizzo: { orders_month: 100 } }).entro,
  };
});
dico('Standard non ha la produzione, Premium sì',
  diritti.stdProduzione === false && diritti.premProduzione === true);
dico('Standard non ha le API', diritti.stdApi === false);
dico('scaduto: niente CRM, ma la dashboard resta raggiungibile',
  diritti.fuoriCrm === false && diritti.fuoriDashboard === true);
dico('chiamare la funzione senza passare dal pulsante non la sblocca', diritti.direttoBloccato);
dico('il blocco dice quale piano serve: «' + diritti.messaggio + '»', /Premium/.test(diritti.messaggio));
dico('99 ordini su 100 passano, 100 no', diritti.limite99 === true && diritti.limite100 === false);

/* ── UI · la schermata di accesso ───────────────────────────────────────── */

const ui = await page.evaluate(() => {
  const host = document.createElement('div');
  host.id = 'ly-prova';
  document.body.appendChild(host);
  window.InglyLancio.renderPrezzi(host);
  const testoPrezzi = host.innerText;

  const host2 = document.createElement('div');
  document.body.appendChild(host2);
  const S = window.InglyAbbonamento;
  window.InglyLancio.renderAbbonamento(host2, {
    abbonamento: S.creaAttivo('premium', 'monthly'), utilizzo: { orders_month: 82, users: 2 },
  });
  const testoAbb = host2.innerText;

  const bloccoHtml = window.InglyLancio.blocco('production',
    window.InglyEntitlements.can('production', { abbonamento: S.creaAttivo('standard', 'monthly') }));

  const gate = document.getElementById('saas-gate');
  const campi = ['gate-user', 'gate-pass', 'gate-submit', 'gate-err',
    'reg-lab', 'reg-user', 'reg-email', 'reg-pass', 'reg-submit', 'reg-err']
    .filter((id) => !!document.getElementById(id));
  const etichette = gate ? gate.querySelectorAll('label[for]').length : 0;
  const risultato = {
    prezziHa3: (testoPrezzi.match(/Standard|Premium|Business/g) || []).length >= 3,
    prezziMostra19: /19/.test(testoPrezzi) && /39/.test(testoPrezzi) && /79/.test(testoPrezzi),
    prezziCta: /Inizia gratis/.test(testoPrezzi) && !/Compra ora/.test(testoPrezzi),
    abbPiano: /Premium/.test(testoAbb),
    abbUso: /82/.test(testoAbb) && /500/.test(testoAbb),
    abbStato: /Attivo/.test(testoAbb),
    bloccoPremium: /Premium/.test(bloccoHtml) && /Scopri/.test(bloccoHtml),
    gateEsiste: !!gate,
    campi: campi.length,
    etichette: etichette,
    /* Nessuna emoji come elemento strutturale nella schermata di accesso. */
    emojiNelGate: gate ? (gate.innerHTML.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length : -1,
  };
  host.remove(); host2.remove();
  return risultato;
});
dico('il listino mostra i tre piani con i loro prezzi',
  ui.prezziHa3 && ui.prezziMostra19);
dico('la chiamata all\'azione è «Inizia gratis», non «Compra ora»', ui.prezziCta);
dico('l\'abbonamento mostra piano, stato e utilizzo (82/500)',
  ui.abbPiano && ui.abbStato && ui.abbUso);
dico('il blocco di una funzione propone il piano invece di nasconderla', ui.bloccoPremium);
dico('la schermata di accesso ha tutti e dieci i campi (' + ui.campi + ')', ui.campi === 10);
dico('ogni campo ha la sua etichetta (' + ui.etichette + ')', ui.etichette >= 6);
dico('nessuna emoji come struttura nella schermata di accesso (' + ui.emojiNelGate + ')',
  ui.emojiNelGate === 0);

/* ── Responsive ─────────────────────────────────────────────────────────── */

const misure = [];
for (const [nome, w, h] of [['desktop', 1440, 900], ['tablet', 834, 1112], ['mobile', 390, 844]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(400);
  misure.push(await page.evaluate((n) => {
    const g = document.getElementById('saas-gate');
    return { nome: n, overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      visibile: !!g && g.getBoundingClientRect().width > 0 };
  }, nome));
}
misure.forEach((m) => {
  dico(m.nome + ' · la schermata di accesso si vede', m.visibile);
  dico(m.nome + ' · nessuno sbordamento orizzontale', m.overflow === false);
});

console.log('\nLANCIO SAAS · SICUREZZA, PIANI, DIRITTI, UI\n');
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
console.log('\nnessuna porta di servizio, nessun prezzo scritto a mano ✔\n');
await browser.close();

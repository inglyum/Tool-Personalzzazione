#!/usr/bin/env node
/**
 * import-export.mjs — quello che esce deve poter rientrare.
 *
 * Il difetto che ha originato questa suite: il pannello «Backup & Ripristino»
 * scriveva le chiavi di primo livello del file in `localStorage`. Su un backup
 * `INGLY_FULL` quelle chiavi sono `_ts`, `_v`, `data` e `images`: due di esse
 * finivano salvate come la stringa «[object Object]», nessun record entrava, e
 * il pannello annunciava «✅ Dati ripristinati con successo».
 *
 * Nessun controllo poteva accorgersene, perché tutti i collaudi si fermavano
 * prima del selettore di file. Playwright il selettore lo sa pilotare
 * (`setInputFiles`): questa suite lo usa, e chiude quel punto cieco.
 *
 * Il file di prova si costruisce qui, a ogni corsa: un backup vero contiene
 * nomi di clienti e non va in un repository. Per collaudare su un file reale:
 *
 *   BACKUP_REALE=/percorso/al/backup.json node tests/qa/import-export.mjs
 *
 *   node tests/qa/import-export.mjs [file]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'ingly-import-'));

/* ── Il file di prova: un backup nel formato che l'applicazione produce ──── */
const ATTESI = { clients: 7, catalog: 5, orders: 4, materials: 3, quotes: 2 };
const finto = {
  _ts: '2026-09-04T21:00:03.598Z',
  _v: 'INGLY_FULL',
  data: {
    clients: Array.from({ length: ATTESI.clients }, (_, i) => ({
      id: 900001 + i, name: 'Cliente di collaudo ' + (i + 1), phone: '', email: '', tags: [],
    })),
    catalog: Array.from({ length: ATTESI.catalog }, (_, i) => ({
      id: 910001 + i, name: 'Prodotto di collaudo ' + (i + 1), salePrice: 10 + i, costPrice: 4 + i,
      category: 'Collaudo',
    })),
    orders: Array.from({ length: ATTESI.orders }, (_, i) => ({
      id: 920001 + i, title: 'Ordine di collaudo ' + (i + 1), status: 'nuovo', total: 100 + i,
    })),
    materials: Array.from({ length: ATTESI.materials }, (_, i) => ({
      id: 930001 + i, name: 'Materiale di collaudo ' + (i + 1), quantity: 5, unit: 'pz', cost: 3,
    })),
    quotes: Array.from({ length: ATTESI.quotes }, (_, i) => ({
      id: 940001 + i, number: 'PRV-COLL-' + (i + 1), total: 250 + i, status: 'draft',
    })),
    /* Uno store vuoto e uno effimero: il ripristino deve saltarli senza
       inciampare. */
    bookings: [],
    kpi_cache: [{ id: 1, v: 'roba che si rigenera' }],
  },
  /* Un'immagine ricollegata a un prodotto già presente nel `data`. */
  images: {
    catalog: {
      910001: { photo: 'data:image/png;base64,' + 'A'.repeat(200) },
    },
  },
};
const percorsoFinto = path.join(cartella, 'ingly_FULL_backup_collaudo.json');
fs.writeFileSync(percorsoFinto, JSON.stringify(finto));

/* Il formato «piatto»: niente involucro, gli store in cima. Backup vecchi. */
const percorsoPiatto = path.join(cartella, 'ingly_backup_piatto.json');
fs.writeFileSync(percorsoPiatto, JSON.stringify({
  clients: [{ id: 950001, name: 'Cliente da backup piatto' }],
  catalog: [{ id: 950002, name: 'Prodotto da backup piatto', salePrice: 9 }],
}));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
const dialoghi = [];
page.on('dialog', async (d) => {
  dialoghi.push(d.message().replace(/\s+/g, ' ').slice(0, 200));
  await d.accept().catch(() => {});
});

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
  /* I file che escono si intercettano qui: un `<a download>` in una pagina
     `file://` non produce un download osservabile, ma il contenuto sì. */
  window.__scaricati = [];
  /* Il Blob si tiene, non si legge subito: `blob.text()` è una promessa che si
     risolve **dopo** il `click()`, e leggerla lì darebbe sempre stringa vuota.
     Si conserva il riferimento e lo si legge quando serve. */
  const blobDi = new Map();
  const veroCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    const url = veroCreate(blob);
    try { blobDi.set(url, blob); } catch (e) { /* non è un Blob */ }
    return url;
  };
  const veroClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) {
      const u = String(this.href);
      window.__scaricati.push({ nome: this.download, href: u.slice(0, 60), url: u });
      return;   // niente navigazione durante il collaudo
    }
    return veroClick.apply(this, arguments);
  };
  /* Il contenuto dell'ultimo file «scaricato», letto adesso. */
  window.__ultimoTesto = async () => {
    const d = window.__scaricati[window.__scaricati.length - 1];
    if (!d) return null;
    if (blobDi.has(d.url)) return blobDi.get(d.url).text();
    if (d.url.startsWith('data:')) {
      const virgola = d.url.indexOf(',');
      const testa = d.url.slice(0, virgola);
      const corpo = d.url.slice(virgola + 1);
      return /;base64/.test(testa) ? atob(corpo) : decodeURIComponent(corpo);
    }
    return null;
  };
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const conta = () => page.evaluate(async (chiavi) => {
  const out = {};
  for (const s of chiavi) out[s] = (await IDB.getAll(s).catch(() => [])).length;
  return out;
}, Object.keys(ATTESI));

async function vaiAlBackup() {
  await page.evaluate(async () => {
    App.navigate('backup');
    await new Promise((s) => setTimeout(s, 2500));
  });
}

/* ── FASE A · il pannello in cima è quello che l'utente preme ───────────── */
await vaiAlBackup();
const pannelli = await page.evaluate(() => {
  const v = document.getElementById('view-backup');
  const inputs = [...v.querySelectorAll('input[type=file]')];
  return {
    quantiInput: inputs.length,
    primoId: inputs[0] ? (inputs[0].id || '(senza id)') : null,
    /* Il pulsante che si vede per primo: quello che un utente preme. */
    primoPulsante: (v.querySelector('[id*="import"], [onclick*="mport"]') || {}).textContent || null,
  };
});
dico('FASE A · la scheda Backup offre un selettore di file (' + pannelli.quantiInput + ')',
  pannelli.quantiInput >= 1);

/* ── FASE B · il file INGLY_FULL entra dal primo selettore ──────────────── */
const primo = await page.$('#view-backup input[type=file]');
await primo.setInputFiles(percorsoFinto);
await page.waitForTimeout(6000);
const dopoFull = await conta();
dico('FASE B · il primo selettore usa il ripristino vero (avviso: "'
  + (dialoghi[0] || '—').slice(0, 60) + '…")',
  dialoghi.some((d) => /RIPRISTINO BACKUP/i.test(d)));
dico('FASE B2 · l avviso dichiara quanti record e quante categorie',
  dialoghi.some((d) => /record in \d+ categorie/i.test(d)));
for (const s of Object.keys(ATTESI)) {
  dico('FASE B3 · ' + s + ': ' + dopoFull[s] + ' record importati (attesi ' + ATTESI[s] + ')',
    dopoFull[s] === ATTESI[s]);
}
const immagine = await page.evaluate(async () => {
  const r = await IDB.get('catalog', 910001).catch(() => null);
  return { c: !!r, foto: r && typeof r.photo === 'string' ? r.photo.length : 0 };
});
dico('FASE B4 · l immagine del backup è tornata sul suo prodotto ('
  + immagine.foto + ' caratteri)', immagine.c && immagine.foto > 100);
const spazzatura = await page.evaluate(() => ['_ts', '_v', 'data', 'images']
  .filter((k) => localStorage.getItem(k) !== null));
dico('FASE B5 · nessuna chiave spuria in localStorage ('
  + (spazzatura.join(', ') || 'nessuna') + ')', spazzatura.length === 0);

/* ── FASE C · quello che esce rientra: giro completo ────────────────────── */
await vaiAlBackup();
const esportato = await page.evaluate(async () => {
  window.__scaricati.length = 0;
  await Backup.downloadWithImages();
  await new Promise((s) => setTimeout(s, 1500));
  const d = window.__scaricati[window.__scaricati.length - 1];
  const testo = await window.__ultimoTesto();
  return { nome: d && d.nome, lunghezza: testo ? testo.length : 0, testo };
});
dico('FASE C · «Backup completo» produce un file (' + (esportato.nome || '—') + ', '
  + esportato.lunghezza + ' caratteri)',
  !!esportato.nome && /\.json$/.test(esportato.nome) && esportato.lunghezza > 500);

let riletto = null;
try { riletto = JSON.parse(esportato.testo || 'null'); } catch (e) { /* resta null */ }
dico('FASE C2 · il file esportato è JSON valido nel formato dichiarato ('
  + (riletto ? riletto._v : 'illeggibile') + ')',
  !!riletto && riletto._v === 'INGLY_FULL' && !!riletto.data);
dico('FASE C3 · e contiene i record che erano in archivio ('
  + (riletto ? Object.keys(ATTESI).map((s) => s + ':' + (riletto.data[s] || []).length).join(' ') : '—') + ')',
  !!riletto && Object.keys(ATTESI).every((s) => (riletto.data[s] || []).length === ATTESI[s]));

/* Si svuota, si reimporta il file appena esportato, si riconta. */
const percorsoGiro = path.join(cartella, 'ingly_giro_completo.json');
fs.writeFileSync(percorsoGiro, esportato.testo || '{}');
await page.evaluate(async (chiavi) => {
  for (const s of chiavi) await IDB.clearStore(s).catch(() => {});
}, Object.keys(ATTESI));
const svuotato = await conta();
dico('FASE C4 · l archivio si svuota davvero prima della riprova ('
  + Object.values(svuotato).join('/') + ')',
  Object.values(svuotato).every((n) => n === 0));

await vaiAlBackup();
const perGiro = await page.$('#view-backup input[type=file]');
await perGiro.setInputFiles(percorsoGiro);
await page.waitForTimeout(6000);
const dopoGiro = await conta();
dico('FASE C5 · reimportando il file esportato tornano tutti i record ('
  + Object.keys(ATTESI).map((s) => s + ':' + dopoGiro[s]).join(' ') + ')',
  Object.keys(ATTESI).every((s) => dopoGiro[s] === ATTESI[s]));

/* ── FASE D · il formato piatto, senza involucro ────────────────────────── */
await vaiAlBackup();
const perPiatto = await page.$('#view-backup input[type=file]');
await perPiatto.setInputFiles(percorsoPiatto);
await page.waitForTimeout(5000);
const piatto = await page.evaluate(async () => ({
  cliente: !!(await IDB.get('clients', 950001).catch(() => null)),
  prodotto: !!(await IDB.get('catalog', 950002).catch(() => null)),
}));
dico('FASE D · anche un backup vecchio in formato piatto viene riconosciuto',
  piatto.cliente && piatto.prodotto);

/* ── FASE E · le esportazioni CSV producono righe, non file vuoti ───────── */
await page.evaluate(async () => {
  await IDB.putBulk('clients', [{ id: 960001, name: 'Cliente CSV', email: 'a@b.c' }]).catch(() => {});
  await IDB.putBulk('catalog', [{ id: 960002, name: 'Prodotto CSV', salePrice: 12, costPrice: 5 }]).catch(() => {});
});
const csv = await page.evaluate(async () => {
  const out = {};
  const prova = async (nome, fn) => {
    window.__scaricati.length = 0;
    try { await fn(); } catch (e) { out[nome] = { errore: String(e.message).slice(0, 80) }; return; }
    await new Promise((s) => setTimeout(s, 1200));
    const d = window.__scaricati[window.__scaricati.length - 1];
    const testo = await window.__ultimoTesto();
    out[nome] = d
      ? { nome: d.nome, righe: testo ? testo.trim().split(/\r?\n/).length : null }
      : { errore: 'nessun file prodotto' };
  };
  await prova('clienti', () => Backup.exportCSV('clients'));
  await prova('catalogo', () => Backup.exportCSV('catalog'));
  await prova('catalogoCatalog', () => Catalog.exportCatalogCSV());
  return out;
});
for (const [nome, r] of Object.entries(csv)) {
  dico('FASE E · esportazione CSV «' + nome + '»: '
    + (r.errore ? r.errore : r.nome + ' · ' + r.righe + ' righe'),
    !r.errore && r.righe >= 2);
}

/* ── FASE F · su un backup vero, se ne è stato indicato uno ─────────────── */
if (process.env.BACKUP_REALE && fs.existsSync(process.env.BACKUP_REALE)) {
  const atteso = JSON.parse(fs.readFileSync(process.env.BACKUP_REALE, 'utf8'));
  const mappa = atteso.data || atteso;
  const grandi = Object.keys(mappa)
    .filter((k) => Array.isArray(mappa[k]) && mappa[k].length > 5).slice(0, 8);
  await vaiAlBackup();
  const perVero = await page.$('#view-backup input[type=file]');
  await perVero.setInputFiles(process.env.BACKUP_REALE);
  await page.waitForTimeout(30000);
  const dopoVero = await page.evaluate(async (chiavi) => {
    const out = {};
    for (const s of chiavi) out[s] = (await IDB.getAll(s).catch(() => [])).length;
    return out;
  }, grandi);
  const sbagliati = grandi.filter((s) => dopoVero[s] < mappa[s].length);
  dico('FASE F · il backup reale indicato entra per intero ('
    + grandi.map((s) => s + ':' + dopoVero[s] + '/' + mappa[s].length).join(' ') + ')',
    sbagliati.length === 0);
} else {
  console.log('  (FASE F saltata: nessun BACKUP_REALE indicato — è una prova facoltativa)');
}

console.log('\nIMPORT ED EXPORT — QUELLO CHE ESCE DEVE POTER RIENTRARE\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
fs.rmSync(cartella, { recursive: true, force: true });
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nun backup che si scarica si ricarica ✔\n');
await browser.close();

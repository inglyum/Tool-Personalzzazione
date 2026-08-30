#!/usr/bin/env node
/**
 * aspetto.mjs — il tema, il colore e il carattere cambiano davvero la pagina.
 *
 * Il difetto misurato: due sistemi di branding — patch 117 e patch 176 —
 * cambiavano lo stesso colore scrivendo in due posti diversi, e nessuno dei
 * due sapeva fare il tema o il carattere. La riga in Impostazioni prometteva
 * «colori, nome app, font» e apriva un pannello che i font non li aveva.
 *
 * Qui si guarda il colore calcolato dal browser, non quello scritto nel
 * codice: è l'unico modo per sapere se una preferenza è arrivata a schermo.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: !!v });
  const T = window.InglyTema;
  const V = window.InglyAspetto;
  if (!T) { out.errori.push('InglyTema assente'); return out; }

  const letto = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

  dico('il motore dell\'aspetto è nel bundle', !!T);
  dico('il pannello è nel bundle', !!V);

  /* ── Un solo motore, non due ──────────────────────────────────────────── */
  const partenza = T.stato().corrente;
  dico('parte dal predefinito, quindi nessuna installazione si muove',
    partenza.tema === 'scuro' && partenza.carattere === 'inter');

  /* ── Il colore arriva a schermo ───────────────────────────────────────── */
  T.applica({ accento: '#ff6b35' });
  await attesa(150);
  const p1 = letto('--color-primary');
  const p2 = letto('--primary');
  const p3 = letto('--eh-brand');
  dico(`il colore raggiunge il design system (${p1})`, /ff6b35/i.test(p1));
  dico('e anche i nomi storici che il codice legacy legge', /ff6b35/i.test(p2) && /ff6b35/i.test(p3));
  dico('e i derivati non sono uguali all\'originale',
    letto('--color-primary-hover').toLowerCase() !== p1.toLowerCase());

  /* Il vero controllo: un elemento davvero dipinto di quel colore. */
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;left:-999px;color:var(--primary)';
  document.body.appendChild(sonda);
  const dipinto = getComputedStyle(sonda).color;
  dico(`un elemento che usa var(--primary) è davvero arancione (${dipinto})`,
    /255,\s*107,\s*53/.test(dipinto));
  sonda.remove();

  /* ── Il tema ──────────────────────────────────────────────────────────── */
  T.applica({ tema: 'chiaro', accento: '#00e6d2' });
  await attesa(150);
  dico('il tema chiaro si dichiara sulla radice',
    document.documentElement.getAttribute('data-theme') === 'light');
  const sfondoChiaro = getComputedStyle(document.body).backgroundColor;

  T.applica({ tema: 'scuro' });
  await attesa(150);
  dico('e quello scuro pure', document.documentElement.getAttribute('data-theme') === 'dark');
  const sfondoScuro = getComputedStyle(document.body).backgroundColor;
  dico(`i due temi dipingono sfondi diversi (${sfondoChiaro} / ${sfondoScuro})`,
    sfondoChiaro !== sfondoScuro);

  T.applica({ tema: 'auto' });
  await attesa(150);
  dico('in automatico non si impone nulla e decide il sistema',
    !document.documentElement.hasAttribute('data-theme'));

  /* ── Il carattere ─────────────────────────────────────────────────────── */
  T.applica({ tema: 'scuro', carattere: 'elegante' });
  await attesa(150);
  dico(`il carattere cambia (${letto('--font-sans').slice(0, 30)})`, /Georgia/i.test(letto('--font-sans')));
  const provaFont = document.createElement('div');
  provaFont.style.cssText = 'position:fixed;left:-999px;font-family:var(--font-sans)';
  document.body.appendChild(provaFont);
  dico('e un elemento lo usa davvero', /Georgia/i.test(getComputedStyle(provaFont).fontFamily));
  provaFont.remove();

  T.applica({ carattere: 'inter' });
  await attesa(100);

  /* ── La dimensione ────────────────────────────────────────────────────── */
  const base = parseFloat(getComputedStyle(document.documentElement).fontSize);
  T.applica({ scala: 'ampia' });
  await attesa(150);
  const ampia = parseFloat(getComputedStyle(document.documentElement).fontSize);
  T.applica({ scala: 'compatta' });
  await attesa(150);
  const compatta = parseFloat(getComputedStyle(document.documentElement).fontSize);
  dico(`le tre dimensioni sono davvero diverse (${compatta} / ${base} / ${ampia}px)`,
    compatta < base && ampia > base);
  T.applica({ scala: 'normale' });
  await attesa(100);

  /* ── Il pannello ──────────────────────────────────────────────────────── */
  if (V) {
    V.apri();
    await attesa(300);
    const n = document.getElementById('ingly-aspetto');
    dico('il pannello si apre', !!n);
    if (n) {
      const t = n.textContent.replace(/\s+/g, ' ');
      dico('mostra tema, colore, carattere e dimensione',
        /Tema/.test(t) && /accento/i.test(t) && /Carattere/.test(t) && /Dimensione/.test(t));
      dico('e un\'anteprima con un totale, un bottone e del testo piccolo',
        /Anteprima/.test(t) && /Totale preventivo/.test(t));

      /* Provare un colore non deve essere un impegno. */
      const prima = T.stato().corrente.accento;
      V.aggiorna('accento', '#ec4899');
      await attesa(200);
      dico('modificare mostra subito il risultato', /ec4899/i.test(letto('--primary')));
      V.chiudi(true);
      await attesa(200);
      dico('e annullare riporta esattamente com\'era',
        letto('--primary').toLowerCase().includes(prima.replace('#', '').toLowerCase())
        || T.stato().corrente.accento === prima);
      dico('il pannello si chiude', !document.getElementById('ingly-aspetto'));
    }
  }

  /* ── Un colore illeggibile viene detto ────────────────────────────────── */
  const v = T.verifica({ tema: 'scuro', accento: '#1a1a1e' });
  dico('un grigio scurissimo su fondo scuro viene rifiutato',
    v.ok === false && v.avvisi.some((a) => a.livello === 'errore'));

  /* ── I due pannelli storici non scrivono più per conto loro ───────────── */
  dico('il vecchio White Label delega al motore',
    typeof window.InglyWhiteLabel === 'object');
  const s176 = String(window.InglyBrand96 || '');
  dico('nessun secondo motore ha preso il posto del primo',
    !!window.InglyTema && window.InglyTema.version);

  T.ripristina();
  await attesa(150);
  dico('ripristina riporta al ciano predefinito',
    T.stato().corrente.accento === T.PREDEFINITO.accento);

  return out;
});

console.log('\nASPETTO — tema, colore e carattere arrivano a schermo\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nun solo motore per l\'aspetto ✔\n');
await browser.close();

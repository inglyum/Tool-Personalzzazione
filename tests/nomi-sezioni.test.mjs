/**
 * nomi-sezioni.test.mjs — una sezione, un nome mostrato.
 *
 * Il difetto misurato: 52 sezioni su 95 avevano due nomi. «Banca & fondi» nel
 * menu, «Bank & Funds» nei risultati di ricerca e nell'intestazione della
 * sezione. Chi la cercava con il nome che vedeva nella sezione non la trovava
 * nel menu, e concludeva che la categoria mancasse.
 *
 * Non mancava: era lì, con un altro nome.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NAV_GROUPS, allItems } from '../src/app-shell/nav-map.js';

const items = allItems();
const norm = (s) => String(s).toLowerCase().replace(/[&·\s]+/g, ' ').trim();

/* I nomi che l'indice di ricerca porta con sé: sono quelli con cui la gente
   cerca davvero, ed erano la seconda sorgente. */
const indice = (() => {
  const src = fs.readFileSync('src/legacy/patches/117-ingly-smart-search-engine-v33.js', 'utf8');
  const m = {};
  for (const r of src.matchAll(/\{s:'([a-z_0-9]+)',\s*n:'([^']+)'/g)) m[r[1]] = r[2];
  return m;
})();

test('ogni nome dell indice di ricerca è raggiungibile dalla tassonomia', () => {
  const orfani = [];
  for (const it of items) {
    const storico = indice[it.id];
    if (!storico) continue;
    const nomi = [it.label].concat(it.aka || []).map(norm);
    if (!nomi.includes(norm(storico))) orfani.push(`${it.id}: «${storico}» non fra ${JSON.stringify(nomi)}`);
  }
  assert.deepEqual(orfani, [], `nomi con cui la gente cerca e che il menu non conosce:\n  ${orfani.join('\n  ')}`);
});

test('le due sezioni che l utente non trovava hanno il nome che l utente usa', () => {
  const ideas = items.find((i) => i.id === 'ideas');
  const bank = items.find((i) => i.id === 'bank_funds');
  assert.equal(ideas.label, 'Idee & Ispirazione');
  assert.equal(bank.label, 'Bank & Funds');
});

test('il nome vecchio resta cercabile, non sparisce', () => {
  const ideas = items.find((i) => i.id === 'ideas');
  const bank = items.find((i) => i.id === 'bank_funds');
  assert.ok((ideas.aka || []).some((a) => norm(a) === norm('Idee & prototipi')));
  assert.ok((bank.aka || []).some((a) => norm(a) === norm('Banca & fondi')));
});

test('nessun aka ripete l etichetta: sarebbe rumore, non un sinonimo', () => {
  const inutili = items
    .filter((i) => (i.aka || []).some((a) => norm(a) === norm(i.label)))
    .map((i) => i.id);
  assert.deepEqual(inutili, []);
});

test('due sezioni diverse non mostrano lo stesso nome', () => {
  const visti = new Map();
  const scontri = [];
  for (const it of items) {
    const k = norm(it.label);
    if (visti.has(k)) scontri.push(`${visti.get(k)} e ${it.id} si chiamano entrambe «${it.label}»`);
    else visti.set(k, it.id);
  }
  assert.deepEqual(scontri, []);
});

test('ogni voce ha un nome non vuoto', () => {
  const mute = items.filter((i) => !i.label || !String(i.label).trim()).map((i) => i.id);
  assert.deepEqual(mute, []);
});

test('l indice di ricerca non dichiara più un nome proprio: lo prende dalla tassonomia', () => {
  const src = fs.readFileSync('src/legacy/patches/117-ingly-smart-search-engine-v33.js', 'utf8');
  assert.ok(
    /item\.n\s*=\s*it\.label/.test(src),
    'l indice deve allinearsi a nav-map, altrimenti torna a essere una seconda sorgente di nomi',
  );
});

test('un gruppo non nasconde tutte le sue voci dietro «Altro»', () => {
  /* Un gruppo senza nemmeno una voce in evidenza si presenta vuoto: bisogna
     sapere che si espande per scoprire che contiene qualcosa. */
  const ciechi = NAV_GROUPS.filter((g) => g.items.length && !g.items.some((i) => i.primary)).map((g) => g.id);
  assert.deepEqual(ciechi, []);
});

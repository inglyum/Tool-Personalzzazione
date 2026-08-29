/**
 * La tassonomia deve coprire esattamente le sezioni che esistono: né una in
 * meno (una funzione diventerebbe irraggiungibile) né una in più (una voce di
 * menu porterebbe a una schermata vuota).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NAV_GROUPS, NAV_ALIASES, NAV_EXCLUDED, allItems, resolveSection } from '../src/app-shell/nav-map.js';

const baseline = JSON.parse(fs.readFileSync('baseline/ingly-os.json', 'utf8'));
const items = allItems();
const mapped = new Set([...items.map((i) => i.id), ...Object.keys(NAV_ALIASES), ...Object.keys(NAV_EXCLUDED)]);

/* Una sezione «esiste» se si può aprire, non se da qualche parte nel codice
   storico compare un attributo `data-section`. Quella era una buona
   approssimazione finché il menu lo costruivano le patch; da quando lo
   costruisce nav-map.js non lo è più — la voce «clienti» sparì dall'elenco
   delle sezioni nel momento in cui si ritirò l'ultima patch che la citava,
   pur restando perfettamente funzionante.

   La definizione giusta è: esiste una vista, o esiste un id di sezione. */
const esiste = (id) => baseline.sections.includes(id) || baseline.views.includes(id);

test('ogni sezione dell applicazione è collocata', () => {
  const orphans = baseline.sections.filter((s) => !mapped.has(s));
  assert.deepEqual(orphans, [], `sezioni senza posto nella tassonomia: ${orphans.join(', ')}`);
});

test('la tassonomia non inventa sezioni inesistenti', () => {
  // Le sezioni introdotte dopo il v96 dichiarano chi le crea: senza `addedBy`
  // una voce che non corrisponde a nulla resta un errore.
  const added = new Set(items.filter((i) => i.addedBy).map((i) => i.id));
  const ghosts = items.map((i) => i.id).filter((s) => !esiste(s) && !added.has(s));
  assert.deepEqual(ghosts, [], `voci di menu che non aprono nulla: ${ghosts.join(', ')}`);
});

test('ogni alias porta a una destinazione che esiste', () => {
  /* Un alias non è una sezione: è un id storico che ne apre un'altra. Quel che
     deve esistere è la destinazione. Questo controllo prima non c'era, e un
     alias verso il nulla — che apre una schermata vuota — sarebbe passato. */
  const rotti = Object.entries(NAV_ALIASES)
    .filter(([, destinazione]) => !esiste(destinazione))
    .map(([id, destinazione]) => `${id} → ${destinazione}`);
  assert.deepEqual(rotti, [], `alias verso una sezione inesistente: ${rotti.join(', ')}`);
});

test('ogni sezione nuova è davvero creata da codice del progetto', () => {
  const sources = fs.readdirSync('src/product').map((f) => fs.readFileSync('src/product/' + f, 'utf8')).join('\n');
  for (const i of items.filter((x) => x.addedBy)) {
    assert.ok(
      sources.includes("'view-' + SECTION") || sources.includes('view-' + i.id),
      `la sezione ${i.id} è dichiarata come nuova ma nessun modulo ne crea la vista`,
    );
  }
});

test('nessuna sezione compare due volte nel menu', () => {
  const seen = new Map();
  for (const i of items) {
    assert.ok(!seen.has(i.id), `${i.id} compare in ${seen.get(i.id)} e in ${i.group}`);
    seen.set(i.id, i.group);
  }
});

test('gli alias puntano a una voce reale del menu', () => {
  const ids = new Set(items.map((i) => i.id));
  for (const [alias, target] of Object.entries(NAV_ALIASES)) {
    assert.ok(ids.has(target), `l'alias ${alias} punta a ${target}, che non è nel menu`);
    assert.equal(resolveSection(alias), target);
  }
});

test('ogni esclusione è motivata', () => {
  for (const [id, reason] of Object.entries(NAV_EXCLUDED)) {
    assert.ok(reason.length > 40, `l'esclusione di ${id} non è spiegata`);
  }
});

test('ogni gruppo ha voci in evidenza e resta leggibile', () => {
  for (const g of NAV_GROUPS) {
    const primary = g.items.filter((i) => i.primary);
    assert.ok(primary.length >= 1, `il gruppo ${g.id} non ha voci in evidenza`);
    assert.ok(primary.length <= 6, `il gruppo ${g.id} ha ${primary.length} voci in evidenza: troppe`);
    assert.ok(g.label && g.icon, `il gruppo ${g.id} è incompleto`);
  }
});

test('ogni voce dichiara la feature che richiede', () => {
  for (const i of items) assert.ok(i.feature, `${i.id} non dichiara una feature`);
});

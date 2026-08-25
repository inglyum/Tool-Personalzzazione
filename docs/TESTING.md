# TESTING

> La rete di sicurezza di un progetto in cui una singola modifica sbagliata può
> perdersi dentro 9 MB di codice.

---

## 1. Comandi

```bash
npm run verify    # sintassi di ogni blocco JS
npm run build     # compone INGLY OS e INGLY Cloud Admin
npm test          # suite automatica (54 test)
npm run check     # i tre sopra, in sequenza — è quello che gira in CI

npm run qa        # prova reale in Chromium (avvio, navigazione, console)
npm run baseline  # rigenera la fotografia funzionale
npm run audit     # rigenera i numeri citati nella documentazione
```

Serve Node 20+. Per la QA visiva serve Chromium; in questo ambiente è
preinstallato, altrove `npx playwright install chromium`.

---

## 2. I due livelli

### Automatico — `npm test`

Gira in secondi, senza browser, e presidia gli invarianti.

| File | Cosa protegge |
|------|---------------|
| `roundtrip.test.mjs` | Ogni blocco del monolite ha la stessa impronta registrata nel manifest, oppure compare in `baseline/deliberate-changes.json` con la ragione. Fallisce anche al contrario: una modifica dichiarata ma non più presente. |
| `baseline.test.mjs` | Nessuna sezione, vista, variabile globale o chiave di storage è sparita rispetto alla baseline. Aggiungere è sempre lecito; togliere richiede di aggiornare la baseline di proposito. |
| `nav-map.test.mjs` | La tassonomia copre esattamente le 105 sezioni: né una in meno (una funzione diventerebbe irraggiungibile), né una in più (una voce porterebbe a una schermata vuota). |
| `licensing.test.mjs` | I piani sono cumulativi, i prezzi crescono, ogni feature ha un piano minimo, ogni feature citata dal menu esiste nel registro. |
| `admin.test.mjs` | Nessuna credenziale nel sorgente, nessuna password in chiaro, il database non nasce accessibile, l'hashing usa PBKDF2 con salt e confronto a tempo costante. |
| `compose.test.mjs` | I layer di design ritirati non tornano nel build, il design system compare una volta sola, il CSS storico è stratificato e il design system no, nessuna definizione di token circolare. |
| `hygiene.test.mjs` | Nel codice **nuovo**: nessun colore esadecimale fuori dai primitivi, nessun `!important`, nessuna credenziale. |

`src/legacy/` è escluso da `hygiene`: il suo debito è misurato, non ancora
sanato, e bloccarlo lì renderebbe il test rosso per mesi senza dire nulla di
utile.

### Visivo — `tests/qa/`

Nessun refactor di 9 MB di CSS si valida sul diff. Questi script aprono davvero
il prodotto in Chromium.

| Script | Cosa verifica |
|--------|---------------|
| `smoke.mjs` | L'applicazione parte, `App` e `App.navigate` esistono, il tema è quello giusto, quanti overlay coprono la schermata al primo avvio, quanti errori in console. Fotografa le sezioni principali. |
| `navigation.mjs` | Percorre **tutte le 105 sezioni** e riporta quali non diventano visibili, quali non hanno vista, quali restano quasi vuote. |
| `admin.mjs` | Flussi critici della console: `admin/admin` deve essere rifiutato, il primo accesso deve chiedere una password, l'hash deve finire nel database, tutte le 18 pagine devono rendere contenuto. |
| `responsive.mjs` | Quattro viewport × cinque sezioni: il documento non deve mai scorrere in orizzontale, e se sfora dice **quale elemento** lo fa. |

Gli screenshot finiscono in `tests/__screenshots__/` (git-ignored).

---

## 3. Stato attuale

```
npm test          54 test · 54 passati
```

| Misura | v96 di partenza | Adesso |
|--------|----------------:|-------:|
| Errori in console all'avvio (INGLY OS) | 20 | 1 |
| Overlay a schermo intero al primo avvio | 22 | 2 |
| Sezioni percorse senza eccezioni JS | — | 105 / 105 |
| Sezioni che rendono contenuto | — | 90 |
| Overflow orizzontale (4 viewport × 5 sezioni) | — | 0 |
| Errori nella console admin | 1 (`eid is not defined`) | 0 |
| Pagine admin che rendono contenuto | — | 18 / 18 |

L'unico errore rimasto in INGLY OS è una richiesta di rete: il feed dei cambi
valuta della BCE, che offline fallisce. È una chiamata legittima, non un difetto
di caricamento: dopo la rimozione dei CDN non resta **nessun** riferimento
esterno ad asset.

### Quello che i numeri non dicono

Delle 105 sezioni, 90 rendono contenuto. Le altre:

- **4 senza vista** — `briefing`, `crm`, `monthly_report`, `stockplanner`:
  documentate in `src/app-shell/nav-map.js` come non-sezioni (un widget, un
  alias, una sezione consolidata altrove, un id mai esistito). Non hanno voce
  di menu.
- **2 alias** — `clients` e `etsyai` aprono la vista di un'altra sezione. Il
  primo è un alias dichiarato; il secondo è una collisione di routing nel
  codice storico: `App.renderSection('etsyai')` viene intercettata da una patch
  che rende Etsy Analytics, quindi la pagina "Etsy Ideas Lab" resta
  irraggiungibile. Correggerlo richiede di sbrogliare due router che si
  sovrappongono, e va fatto con il refactor del modulo Etsy.
- **9 quasi vuote** — sezioni che si popolano solo con i dati dell'utente. Su
  un'installazione appena creata è il comportamento atteso.

---

## 4. Prima di un commit

```bash
npm run check
```

Se hai toccato CSS o navigazione, aggiungi:

```bash
npm run build && node tests/qa/smoke.mjs dist/INGLY-OS.html
node tests/qa/responsive.mjs dist/INGLY-OS.html
```

e **guarda gli screenshot**. Il numero di errori in console non racconta un
allineamento sbagliato.

Se hai toccato l'Admin:

```bash
node tests/qa/admin.mjs
```

---

## 5. Come si aggiunge un test

La domanda giusta non è "questa funzione restituisce il valore atteso", ma
**"quale regressione questo test impedisce?"**. In un progetto che ricompone
9 MB di codice storico i test che valgono sono quelli che presidiano gli
invarianti:

- una funzionalità non deve sparire → `baseline.test.mjs`
- una modifica non deve passare inosservata → `roundtrip.test.mjs`
- una regola di prodotto non deve essere aggirata → `admin.test.mjs`,
  `licensing.test.mjs`
- una scelta architetturale non deve essere disfatta → `compose.test.mjs`

Un test che verifica il colore di un bottone non impedisce nulla: lo impedisce
il token, e il token lo verifica `hygiene.test.mjs`.

---

## 6. CI

`.github/workflows/ci.yml` esegue `verify → build → test` a ogni push e a ogni
pull request. La QA visiva non gira in CI: richiede un browser e produce
immagini che vanno guardate, non confrontate automaticamente.

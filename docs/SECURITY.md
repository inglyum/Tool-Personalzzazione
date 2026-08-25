# SECURITY

> Cosa è stato corretto, cosa resta aperto, e cosa questo prodotto **non**
> protegge. La terza parte è la più importante: un limite dichiarato è un
> rischio gestibile, un limite nascosto è un incidente rimandato.

---

## 1. Corretto

### S1 — Credenziali master nel sorgente `[BLOCCANTE]`

`doLogin()` conteneva:

```js
// ── EMERGENCY BYPASS: accesso garantito con credenziali master ──
const MASTER_CREDENTIALS = [
  { username: 'superadmin', password: 'admin' },
  { username: 'admin',      password: 'admin' },
];
```

Chiunque aprisse il file entrava come Super Admin. Il blocco veniva eseguito
**dopo** il controllo anti-brute-force, che quindi scavalcava.

**Rimosso.** `tests/admin.test.mjs` fallisce se `MASTER_CREDENTIALS`,
`EMERGENCY BYPASS` o una `password: 'admin'` ricompaiono nel sorgente.

### S2 — Password in chiaro sotto un nome che diceva il contrario `[BLOCCANTE]`

Il campo si chiamava `passwordHash` e conteneva `'admin'`. Il confronto era
`adm.passwordHash === p`.

**Corretto.** `src/admin/auth/credentials.js`: PBKDF2-SHA256, salt di 16 byte
per utente, 310.000 iterazioni (raccomandazione OWASP), confronto a tempo
costante. Nessuna dipendenza: usa `crypto.subtle`.

Formato del record: `pbkdf2$310000$<salt base64>$<hash base64>`

### S3 — Il bypass degradava le password esistenti `[BLOCCANTE]`

Il blocco master, dopo aver dato accesso, eseguiva:

```js
adm2.passwordHash = 'admin';       // normalizza
adm2.active = true;
adm2.mustChangePassword = false;
```

Una password forte scelta dall'utente veniva riportata a `admin` senza avviso.

**Rimosso insieme al bypass.**

### S4 — Il database nasceva già accessibile

`createDB()` seminava due account funzionanti con `mustChangePassword: false`.

**Corretto.** Nasce un solo super admin con `passwordHash: null` e
`mustChangePassword: true`. Al primo accesso la console chiede di impostare una
password che rispetti i requisiti minimi (8 caratteri, maiuscola, minuscola,
numero) e la salva come hash.

### S5 — `eid()` mai definito

Sei funzioni della console — grafico della dashboard, centro scadenze,
configurazione Stripe — si interrompevano con `eid is not defined`. Non è una
vulnerabilità, ma un errore che maschera i problemi veri nella console del
browser. **Definito.**

### Migrazione, senza chiudere fuori nessuno

Un'installazione esistente con password in chiaro continua a funzionare: al
primo accesso riuscito la password viene riscritta come hash
(`needsUpgrade`). Non serve alcun intervento manuale.

---

## 2. Aperto, con il piano

| # | Problema | Perché non è chiuso qui | Piano |
|---|----------|-------------------------|-------|
| **A1** | **Il gating delle licenze è lato client.** `InglyLicense`, `SaaSGate` e il registro feature girano nel browser: chi modifica il file abilita qualsiasi piano. | Una protezione reale richiede un server che validi la licenza. Non esiste ancora. | L'architettura è pronta: il registro in `src/core/licensing/features.js` è la stessa sorgente che userà l'endpoint di validazione. Fino ad allora il gating va presentato come UX, non come protezione. |
| **A2** | **Chiavi API di terze parti in `localStorage` in chiaro** (Gemini, Groq, OpenRouter, Anthropic, Stripe, Supabase: 8 chiavi `ingly_*_key`). | Sono chiavi dell'utente, inserite dall'utente, su un tool che gira sulla sua macchina: non c'è un posto più sicuro senza un backend. | Documentato in Impostazioni. Quando esisterà il backend, le chiamate AI passeranno da lì e le chiavi non toccheranno più il browser. |
| **A3** | **1.436 assegnazioni `.innerHTML =` con interpolazione diretta.** Un nome cliente o una nota con `<img onerror=…>` esegue codice (XSS stored). | Correggerle tutte richiede di rivedere 1.436 punti: va fatto modulo per modulo, con test, non con una sostituzione globale. | Il codice nuovo passa già da `esc()` (vedi `src/app-shell/sidebar.js`). La migrazione dei moduli storici procede insieme al loro refactor. Rischio reale: i dati sono inseriti dall'utente stesso sulla propria macchina, quindi l'attaccante coincide con la vittima — salvo import di CSV/VCF da terzi, che è il primo punto da chiudere. |
| **A4** | **Le password degli utenti finali (`_db.users`) restano in chiaro** e vengono inviate per email dalle funzioni di reset. | È il flusso del portale licenze, che presuppone il backend. Cambiarlo qui romperebbe l'invio credenziali senza sostituirlo con niente. | Quando il backend esisterà: password mai memorizzate in chiaro, reset via link a scadenza invece che via password in chiaro nel corpo dell'email. |
| **A5** | **Nessuna Content-Security-Policy.** Il prodotto usa `onclick` inline (2.543) e `innerHTML`, quindi una CSP stretta lo romperebbe. | Dipende da A3. | Dopo la migrazione degli handler inline a listener delegati. |

---

## 3. Cosa questo prodotto non protegge

INGLY OS è un'applicazione **locale**: un file HTML che gira nel browser
dell'utente, con i dati nel suo `localStorage`. Da questo discendono limiti che
nessuna quantità di codice frontend può superare.

1. **Chi ha accesso al file ha accesso a tutto.** Non c'è un server che decida
   cosa un utente può vedere: il codice e i dati sono sulla sua macchina.
2. **L'autenticazione della console è una serratura, non un muro.** Impedisce
   l'accesso occasionale di chi si siede alla stessa scrivania. Non ferma chi
   apre gli strumenti per sviluppatori.
3. **Le licenze non sono applicabili tecnicamente.** Sono un accordo
   commerciale che il software rende comodo rispettare, non impossibile
   violare.
4. **I backup non sono cifrati.** Un file di export contiene tutti i dati del
   laboratorio in chiaro.

Queste non sono cose da correggere in una fase successiva: sono le conseguenze
della scelta offline-first, che è la ragione per cui il prodotto funziona in un
laboratorio senza IT. Vanno dette al cliente, non aggirate.

---

## 4. Regole per chi lavora sul codice

1. **Nessuna credenziale nel repository.** Un account di sviluppo vive in
   `config/dev.local.js`, che è git-ignored e non entra nel build.
   `tests/hygiene.test.mjs` fallisce se una password o una chiave API compare
   nel codice nuovo.
2. **Nessun segreto nei commit, neanche revocato.** La cronologia è pubblica
   quanto il file.
3. **Tutto ciò che finisce in `innerHTML` passa da una funzione di escaping.**
   Nel codice nuovo non ci sono eccezioni.
4. **Le chiavi di storage non si rinominano senza migrazione** (vedi
   `docs/MIGRATION.md`): una migrazione sbagliata perde i dati di un
   laboratorio, ed è un danno peggiore di quasi ogni vulnerabilità qui elencata.
5. **Un limite si dichiara.** Se una protezione non protegge davvero, il posto
   dove dirlo è questo documento e il commento nel codice — non la scheda
   prodotto.

---

## 5. Verifica

```bash
npm test                       # include i controlli su credenziali e hashing
node tests/qa/admin.mjs        # prova in Chromium: admin/admin deve fallire
```

Il test di QA verifica esplicitamente che le credenziali rimosse **non**
funzionino più, che il primo accesso chieda una password, e che nel database
finisca un record `pbkdf2$…` e non la password.

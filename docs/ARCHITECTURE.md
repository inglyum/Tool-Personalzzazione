# ARCHITECTURE — INGLY OS

> Come è fatto il prodotto, perché è fatto così, e quali sono i confini che non
> vanno superati.

---

## 1. Principio guida

INGLY OS è un'applicazione **offline-first a file singolo**: si apre con un doppio
click, non richiede server, non richiede rete, e i dati restano sul dispositivo.
Questa è una caratteristica di prodotto, non un limite tecnico — è ciò che rende
il tool utilizzabile in un laboratorio senza IT.

Da qui discendono due vincoli architetturali:

1. **La distribuzione resta un unico HTML autoconsistente.** Niente CDN, niente
   fetch di asset a runtime, niente `import` di rete.
2. **Il sorgente non è la distribuzione.** Si sviluppa su file separati e si
   compila. Il monolite è un *artefatto di build*, non il posto in cui si scrive.

Il repository di origine violava il punto 2: si scriveva direttamente dentro il
file compilato, e ogni modifica diventava una patch appesa in fondo. È la causa
strutturale di quasi tutti i problemi elencati in `docs/AUDIT.md`.

---

## 2. Struttura del repository

```
Tool-Personalzzazione/
├── baseline/                  impronte e inventario funzionale di partenza
│   ├── ingly-os.json
│   └── ingly-cloud-admin.json
├── docs/                      audit, architettura, design system, migrazione,
│                              testing, sicurezza
├── scripts/
│   ├── extract.mjs            monolite → sorgenti (one-shot, riproducibile)
│   ├── build.mjs              sorgenti → dist/*.html
│   ├── baseline.mjs           fotografia funzionale
│   └── verify-syntax.mjs      parsing di ogni blocco JS
├── src/
│   ├── design-system/         INGLY DESIGN SYSTEM (token + componenti)
│   ├── app-shell/             sidebar, topbar, tassonomia di navigazione
│   ├── core/  domain/         moduli TypeScript tipizzati e testati
│   ├── modules/ integrations/
│   ├── legacy/                sorgenti estratti dal v96
│   │   ├── manifest.json      ordine di caricamento — è portante
│   │   ├── vendor/            7 librerie vendorizzate (non si toccano)
│   │   ├── app/src/           il vero sorgente modulare (core, utils, moduli)
│   │   ├── patches/           129 strati storici, in ordine
│   │   ├── styles/            20 blocchi CSS
│   │   └── markup/            le viste
│   └── admin/                 INGLY CLOUD ADMIN
├── tests/
└── dist/                      artefatti di build (git-ignored)
```

### 2.1 Perché `src/legacy/` esiste e non è una resa

Le 129 patch contengono funzionalità reale: calcolatori, moduli B2B, market
intelligence, gestione ordini. Riscriverle significherebbe reimplementare anni di
lavoro, con la certezza di perdere comportamenti non documentati.

`src/legacy/` è la **zona di quarantena leggibile**: il codice è lì, in file
nominati e diffabili, invece che in un blob da 9 MB. Da lì migra verso
`src/core/` e `src/domain/` un modulo alla volta, con i test come rete.

La regola: **si può leggere e modificare `src/legacy/`, non ci si può aggiungere
nulla di nuovo.** Il codice nuovo nasce in `src/`.

---

## 3. Il build

```
src/legacy/manifest.json ─┐
src/legacy/**             ├─→ scripts/build.mjs ─→ dist/INGLY-OS.html
src/design-system/**      │                        dist/INGLY-CLOUD-ADMIN.html
src/app-shell/**          ┘
```

`build.mjs` non riordina mai i blocchi: legge il manifest e concatena.
L'ordine di caricamento nel monolite storico è semantico (le patch tarde
sovrascrivono le precedenti); riordinare significherebbe cambiare comportamento.

Il meccanismo di sostituzione è `overrides`: un blocco può essere rimpiazzato
per nome di file senza modificare il manifest. È così che l'INGLY Design System
prende il posto dei layer CSS storici — **sostituendoli**, non impilandosi sopra.

### 3.1 La garanzia di non-perdita

`scripts/build.mjs` senza `overrides` produce un file con lo **stesso SHA-256**
del v96 originale. Il test `tests/roundtrip.test.mjs` lo verifica a ogni CI.

Finché quel test è verde, la decomposizione è provatamente lossless. Quando una
fase introduce override, il test misura *quali* blocchi cambiano e il diff è
leggibile riga per riga.

---

## 4. Strati applicativi

```
┌─────────────────────────────────────────────────────┐
│ APPLICATIONS      INGLY OS  ·  INGLY CLOUD ADMIN     │
├─────────────────────────────────────────────────────┤
│ APP SHELL         sidebar · topbar · breadcrumb ·    │
│                   command palette · toast · modal    │
├─────────────────────────────────────────────────────┤
│ DESIGN SYSTEM     component tokens                   │
│                   semantic tokens                    │
│                   primitive tokens                   │
├─────────────────────────────────────────────────────┤
│ MODULES           105 sezioni di dominio             │
├─────────────────────────────────────────────────────┤
│ DOMAIN            quote · orders · clients · fiscal  │
│                   payments · pricing · reporting     │
├─────────────────────────────────────────────────────┤
│ CORE              store · bus · idb · currency ·     │
│                   format · auth · sync · app         │
├─────────────────────────────────────────────────────┤
│ VENDOR            Chart.js · jsPDF · SheetJS ·       │
│                   html2canvas · JSZip · simple-stats │
└─────────────────────────────────────────────────────┘
```

Le dipendenze puntano solo verso il basso. Oggi il monolite viola questa regola
in più punti (patch che chiamano moduli di livello superiore via polling); la
migrazione la ripristina modulo per modulo, non con un big bang.

---

## 5. Dati e persistenza

| Livello | Tecnologia | Contenuto |
|---------|-----------|-----------|
| Preferenze e stato UI | `localStorage` | tema, sidebar, lingua, tab attive |
| Dati operativi | `localStorage` (113 chiavi) | ordini, preventivi, clienti, magazzino, listini |
| Dati voluminosi | IndexedDB (1 store) | pipeline |
| Backup | file JSON / ZIP | esportazione manuale e automatica |

### 5.1 Regole non negoziabili

1. **Le chiavi di storage non si rinominano senza migrazione.** Ogni cambio di
   schema passa da `src/core/migrations/` con numero di versione e test.
2. **Gli `id` di prodotti, ordini, clienti e licenze non si riusano né si
   rigenerano.**
3. **Nessun dato inventato.** Se un valore non esiste resta `null` e la UI mostra
   uno stato vuoto con una spiegazione, non un numero plausibile.
4. Il dataset dimostrativo vive dietro un flag esplicito e non condivide le chiavi
   di storage con i dati reali.

### 5.2 Debito noto

`localStorage` ha un limite pratico di 5–10 MB e fallisce in silenzio quando si
satura. Un laboratorio con qualche migliaio di ordini ci arriva. La migrazione a
IndexedDB è pianificata **dopo** la stabilizzazione della UI: è un cambiamento di
persistenza, non va mescolato a un refactor visivo.

---

## 6. Navigazione — tassonomia target

105 sezioni distribuite su 16 gruppi ad accumulo diventano 7 gruppi con una
gerarchia leggibile. **Nessuna sezione viene eliminata**: quelle che non hanno
posto in primo piano restano raggiungibili dal gruppo di appartenenza e dalla
command palette.

```
INGLY OS

WORKSPACE      Dashboard · Briefing

PRODUCTION     Work Center · Laser · 3D Print · UV / DTF · Sublimazione
               Pianificazione lavori · Tempi

BUSINESS       Prodotti · Preventivi · Ordini · Clienti · Vendite · Listini

LAB            Macchine · Materiali · Magazzino · Attrezzature · Fornitori

INTELLIGENCE   AI Assistant · Market Intelligence · Quote Intelligence
               Product Finder · Analisi concorrenza

FINANCE        Finance · Fiscale · Analytics · Obiettivi

SYSTEM         Impostazioni · Account · Backup · Storico
```

La mappa completa (105 sezioni → gruppo, etichetta, icona, origine legacy) vive
in `src/app-shell/nav-map.js`, che è **dati, non codice**: un test verifica che
la somma delle sezioni mappate sia esattamente quella della baseline.

### 6.1 Work Center

Un Work Center è la vista operativa di una **macchina reale configurata
dall'utente** in `MachineHub` (già single source of truth dal v61). Mostra:
stato, coda, lavori, tempo di produzione, materiale, costo, completamento stimato,
alert.

Se l'utente non ha configurato macchine, il Work Center mostra uno stato vuoto con
la CTA di configurazione. **Non mostra macchine di esempio.**

### 6.2 Product Builder

Il Product Builder è un'interfaccia sopra i motori esistenti, non un nuovo motore:

```
Prodotto ─┬─ Materiale      → catalogo materiali / magazzino
          ├─ Macchina       → MachineHub
          ├─ Processo       → LaserCalcV2 · Print3DQuoter · apparel
          ├─ Tempi          → dai calcolatori
          ├─ Energia        → CalcMacchine (costo orario macchina)
          ├─ Manodopera     → AutoHourlyRate
          ├─ Packaging      → voci di costo aggiuntive
          └─ Prezzo/Margine → PricingEngine · InglyDomain.quote
```

Nessun calcolo viene riscritto. Se un motore manca di un dato, il campo resta
vuoto e segnalato.

---

## 7. Licensing

Un solo registro condiviso fra OS e Admin, in `src/core/licensing/features.js`.

Oggi esistono due elenchi divergenti (`PLAN_MODULES` nell'OS, `PLANS_CFG`
nell'Admin) che assegnano moduli diversi allo stesso piano. Vengono unificati in
un registro **feature-based**:

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|:----:|:-------:|:---:|:--------:|:----------:|
| Laser | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3D Print | — | ✓ | ✓ | ✓ | ✓ |
| UV / DTF | — | ✓ | ✓ | ✓ | ✓ |
| Sublimazione | — | ✓ | ✓ | ✓ | ✓ |
| Preventivi | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI | — | — | ✓ | ✓ | ✓ |
| Market Intelligence | — | — | ✓ | ✓ | ✓ |
| Multi macchina | — | — | ✓ | ✓ | ✓ |
| Multi utente | — | — | — | ✓ | ✓ |
| Analytics avanzati | — | — | ✓ | ✓ | ✓ |
| API | — | — | — | — | ✓ |

Le sezioni dichiarano la feature che richiedono; il gating deriva, non si scrive
a mano per ogni piano.

> **Il gating lato client è UX, non sicurezza.** Chiunque abbia il file può
> modificarlo. Vale come impedimento all'uso involontario di funzioni non
> acquistate, non come protezione. Una protezione reale richiede validazione
> server-side — vedi `docs/SECURITY.md`.

### 7.1 Billing

Non esiste un backend di pagamento. L'architettura frontend è predisposta
(piani, stati licenza, scadenze, rinnovi), ma **nessuna schermata simula un
pagamento riuscito**. Dove servirebbe il backend, la UI lo dichiara.

---

## 8. INGLY Cloud Admin

Applicazione separata, stesso design system, stesso build. Mantiene integralmente
ruoli, matrice permessi, audit log, anti-sharing, gestione sessioni e dispositivi.

Riorganizzazione delle 18 pagine esistenti in 6 aree:

```
OVERVIEW
CUSTOMERS       Users · Companies · Workspaces
SUBSCRIPTIONS   Plans · Licenses · Payments · Trials
PRODUCT         Features · Feature Flags · Modules
SECURITY        Sessions · Devices · Audit Log · Anti Sharing
SUPPORT         Tickets · Notifications · Announcements
ANALYTICS       MRR · ARR · Churn · Active Users · Feature Usage
```

Le aree senza una pagina esistente (Companies, Workspaces, Trials, Tickets,
Announcements) vengono create come **stati vuoti onesti**, non come schermate
riempite di dati generati.

### 8.1 Autenticazione — cambiamento obbligatorio

L'attuale `doLogin()` contiene un bypass con credenziali `admin/admin` che
scavalca il controllo brute-force e riscrive la password dell'admin esistente.
Va rimosso. Sostituzione:

- primo avvio → creazione guidata del super admin, password scelta dall'utente;
- hashing con `crypto.subtle` (PBKDF2, salt per utente);
- nessuna credenziale nel sorgente;
- un eventuale account di sviluppo vive in `config/dev.local.js`, git-ignored, e
  non entra nella build di produzione.

Dettagli e migrazione in `docs/SECURITY.md`.

---

## 9. Cosa questa architettura rifiuta

| Tentazione | Perché no |
|------------|-----------|
| Riscrivere in React/Vue | Perderemmo 2,6 MB di logica testata sul campo per guadagnare un runtime da 40 KB. Il problema non è la mancanza di un framework. |
| Un nuovo layer CSS "premium" in fondo al file | È esattamente ciò che ha prodotto il problema. Il design system **sostituisce**, non si sovrappone. |
| Bundler pesante con code splitting | La distribuzione è un file singolo offline. Lo splitting è controproducente. |
| Cancellare le patch non capite | Sono funzionalità. Si migrano, non si buttano. |
| Backend obbligatorio | Toglierebbe la caratteristica principale del prodotto. Il cloud è additivo. |

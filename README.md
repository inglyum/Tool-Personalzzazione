# INGLY OS

**Professional Production OS** — il sistema operativo del laboratorio di
produzione digitale.

Un solo file HTML che si apre con un doppio click, funziona senza rete e tiene i
dati sulla macchina di chi lo usa. Preventivi, ordini, clienti, magazzino,
costi, macchine e intelligenza di mercato per chi produce con laser, stampa 3D,
UV, DTF e sublimazione.

```
LASER          CO₂ · Diodo · MOPA · Fibra
3D PRINT       FDM · Resina · materiali · filamenti
DIGITAL PRINT  UV · UV DTF · DTF
SUBLIMAZIONE   presse · transfer · blank
PERSONALIZZAZIONE  gadget · tessile · incisione · decorazione · packaging
```

---

## Cosa contiene questo repository

| Prodotto | Che cos'è |
|----------|-----------|
| **INGLY OS** | L'applicazione. 105 sezioni, offline-first, un file. |
| **INGLY Cloud Admin** | La console SaaS: utenti, piani, licenze, sessioni, audit, anti-sharing. |
| **INGLY Design System** | I token e i componenti che tengono insieme i due. |

---

## Provare l'applicazione

Non serve installare nulla.

1. Prendi `dist/INGLY-OS.html` (o compilalo, vedi sotto).
2. Doppio click: si apre nel browser.
3. I dati restano nel browser. Per portarli altrove: **Impostazioni → Backup**.

> Prima di provare cose importanti, crea un checkpoint da
> *Impostazioni → Audit & Checkpoint*.

Per la console: `dist/INGLY-CLOUD-ADMIN.html`. Al primo avvio chiede di
impostare la password del super admin — non esistono credenziali predefinite.

---

## Sviluppo

Serve **Node 20+**.

```bash
npm install       # dipendenze di sviluppo (font, Playwright)
npm run dev       # server locale: ricompila a ogni ricarica del browser
npm run build     # produce dist/INGLY-OS.html e dist/INGLY-CLOUD-ADMIN.html
npm run preview   # serve il build senza ricompilare
npm run check     # verify + build + test — è quello che gira in CI
```

| Comando | Cosa fa |
|---------|---------|
| `npm run verify` | controlla la sintassi di ogni blocco JS |
| `npm test` | 54 test: nessuna perdita, tassonomia, licenze, sicurezza, igiene |
| `npm run qa` | apre davvero il prodotto in Chromium e ne fotografa le sezioni |
| `npm run baseline` | rigenera la fotografia funzionale |
| `npm run audit` | rigenera i numeri citati nella documentazione |

Il build non richiede rete: font e icone sono incorporati nel repository.

---

## Come è fatto

INGLY OS nasce da un file HTML di 8,93 MB in cui convivevano librerie
vendorizzate, il sorgente modulare originale, 129 patch accumulate fra la v10 e
la v96, e il markup di 123 viste. Funzionava, ma non era rivedibile: qualunque
modifica diventava una patch appesa in fondo.

Questo repository lo **decompone** invece di riscriverlo. `scripts/extract.mjs`
taglia lungo i confini che il file già dichiarava — i marcatori del build
originale e le intestazioni delle patch — e registra l'ordine in un manifest,
perché l'ordine è portante. `scripts/build.mjs` ricompone. Al primo commit il
round-trip produceva un file con lo **stesso SHA-256** dell'originale: da lì in
avanti ogni differenza è una modifica deliberata, dichiarata e leggibile in un
diff.

```
src/
├── design-system/   token (primitive → semantic → component) e componenti
├── app-shell/       tassonomia di navigazione, icone, sidebar
├── core/            registro licenze, adattatori
├── admin/           INGLY Cloud Admin: credenziali, tassonomia, sidebar
└── legacy/          i sorgenti estratti dal v96 — si correggono, non si estendono

scripts/    extract · build · compose · baseline · vendor-fonts · verify-syntax
tests/      suite automatica + QA visiva in Chromium
baseline/   impronte e inventario funzionale di partenza
docs/       audit, architettura, design system, migrazione, testing, sicurezza
```

**Il codice nuovo nasce in `src/`.** `src/legacy/` è la zona di quarantena
leggibile: si può correggere, ma ogni modifica va dichiarata in
`baseline/deliberate-changes.json` con la sua ragione, e un test fallisce se non
lo è.

---

## Licensing

Un solo registro condiviso fra applicazione e console
(`src/core/licensing/features.js`). I piani abilitano **feature**, non elenchi
di sezioni scritti a mano; ogni voce di menu dichiara la feature che le serve, e
i moduli abilitati si calcolano.

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|:----:|:-------:|:---:|:--------:|:----------:|
| Gestionale | ✓ | ✓ | ✓ | ✓ | ✓ |
| Preventivi avanzati | — | ✓ | ✓ | ✓ | ✓ |
| Laser | — | ✓ | ✓ | ✓ | ✓ |
| 3D Print | — | ✓ | ✓ | ✓ | ✓ |
| DTF · Sublimazione · UV | — | ✓ | ✓ | ✓ | ✓ |
| Analytics avanzati | — | — | ✓ | ✓ | ✓ |
| AI | — | — | ✓ | ✓ | ✓ |
| Market Intelligence | — | — | ✓ | ✓ | ✓ |
| Multi macchina | — | — | ✓ | ✓ | ✓ |
| Multi utente | — | — | — | ✓ | ✓ |
| API | — | — | — | — | ✓ |

> Il gating è **lato client**: serve a non mettere davanti all'utente funzioni
> che non ha acquistato, non a impedirne l'uso a chi modifica il file. Una
> protezione reale richiede validazione server-side, che non esiste ancora.
> Nessuna schermata simula un pagamento riuscito. Vedi `docs/SECURITY.md`.

---

## Amministrazione

INGLY Cloud Admin gestisce utenti, aziende, abbonamenti, piani, licenze,
sessioni, dispositivi, audit log, anti-sharing e notifiche, con sei ruoli e una
matrice di dodici permessi.

Al primo avvio esiste un solo super admin **senza password**: la sceglie chi
installa. Le password sono hash PBKDF2-SHA256 con salt per utente. Le
credenziali master che l'Enterprise Admin v1.2 aveva scritte nel sorgente sono
state rimosse, e un test fallisce se ricompaiono.

---

## Configurazione

Tutto sta in *Impostazioni*, dentro l'applicazione: profilo del laboratorio,
macchine, materiali, listini, costi fissi, tariffa oraria, dati fiscali,
branding white-label e chiavi API dei servizi AI.

Le chiavi restano nel browser dell'utente. Non ci sono segreti nel repository:
un eventuale account di sviluppo vive in `config/dev.local.js`, git-ignored e
fuori dal build.

---

## Documentazione

| Documento | Cosa contiene |
|-----------|---------------|
| [`docs/AUDIT.md`](docs/AUDIT.md) | L'architettura reale del v96, i problemi trovati con i numeri che li dimostrano, cosa mantenere e cosa rifare |
| [`docs/BASELINE.md`](docs/BASELINE.md) | L'inventario verificabile di partenza: impronte, sezioni, storage, motori di calcolo |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Vincoli, strati, tassonomia, work center, product builder, e cosa questa architettura rifiuta |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Token, identità, componenti, i due ponti verso il codice storico |
| [`docs/MIGRATION.md`](docs/MIGRATION.md) | Provenienza, cosa non è stato portato, come si modifica il codice storico, migrazioni dei dati |
| [`docs/TESTING.md`](docs/TESTING.md) | I due livelli di test, lo stato attuale, cosa i numeri non dicono |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Cosa è stato corretto, cosa resta aperto, e cosa il prodotto **non** protegge |

---

## Stato

| | v96 di partenza | Adesso |
|-|----------------:|-------:|
| Layer di design | 7 | 1 |
| Gruppi di navigazione | 16 (uno vuoto, due doppioni) | 8 |
| Librerie di icone caricate | 5 (una usata) | 1, incorporata |
| Riferimenti esterni ad asset | 8 | 0 |
| Errori in console all'avvio | 20 | 1 (una fetch di rete) |
| `!important` nel design system | 199 nei layer CSS | 0 |
| Credenziali nel sorgente | 2 | 0 |
| Peso del repository | 492 MB | ~22 MB |

Il lavoro non è finito: `docs/AUDIT.md` §7 elenca le fasi rimaste, e
`docs/SECURITY.md` §2 i problemi aperti con il loro piano. Quello che è finito è
la parte che rendeva impossibile procedere: adesso ogni modifica è visibile in
un diff e verificata da un test.

---

© 2026 INGLY DESIGN — Giuseppe Inglima. Tutti i diritti riservati.
Le librerie di terze parti in `src/legacy/vendor/` restano soggette alle
rispettive licenze; l'elenco è in [`LICENSE`](LICENSE).

# AUDIT — INGLY OS v96 · Enterprise Admin v1.2 · UI/UX Pro Max

> Fase 0 del piano di trasformazione. Nessuna riga di codice applicativo è stata
> modificata per produrre questo documento: tutti i numeri vengono da
> `scripts/extract.mjs` e `scripts/baseline.mjs`, riproducibili con `npm run audit`.

---

## 1. Materiali analizzati

| # | Materiale | Dimensione | Ruolo |
|---|-----------|-----------:|-------|
| 1 | `INGLY OS v96 STANDALONE.html` | 8,93 MB · 107.938 righe | Applicazione principale, offline-first |
| 2 | `INGLY OS Enterprise Admin v1.2.html` | 0,32 MB · 5.852 righe | Console amministrativa SaaS |
| 3 | `ui-ux-pro-max-skill` (ZIP) | 8,4 MB | Framework di design system (metodo, non codice runtime) |
| 4 | `inglyum/Ingly-standalone-html@claude/ingly-os-dev-system-ddgv1f` | 492 MB | Repository di provenienza |

Il materiale 3 **non contiene un runtime CSS da importare**: contiene skill Claude
(`design-system`, `brand`, `ui-styling`, `design`, `banner-design`, `slides`) con
reference su architettura a token, specifiche componenti, stati e varianti, più
validator (`validate-tokens.cjs`, `html-token-validator.py`). Il suo contributo è
**metodologico**: l'architettura `Primitive → Semantic → Component` che adottiamo
in `docs/DESIGN-SYSTEM.md` viene da lì, insieme ai validator che riadattiamo
in `tests/`.

---

## 2. Architettura reale del monolite v96

Il file non è un blob indistinto. La scomposizione automatica rivela **176 blocchi**
`<style>`/`<script>` in ordine di caricamento, appartenenti a cinque strati con
storie diverse:

| Strato | Blocchi | Peso | % del JS |
|--------|--------:|-----:|---------:|
| Librerie vendorizzate inline | 7 | 1,73 MB | 21% |
| **Sorgente modulare reale** (`/src/**`) | 19 | 2,61 MB | 32% |
| Patch storiche accumulate (v10 → v96) | 129 | 3,81 MB | 47% |
| CSS | 20 | 0,11 MB | — |
| Markup viste | — | 0,67 MB | — |
| Script esterno (CDN) | 1 | 0,3 KB | — |

### 2.1 Il sorgente modulare esiste già

Il monolite conserva i marcatori del build originale (`// === /src/... ===`).
Sotto la crosta delle patch c'è una struttura pulita:

```
/src/core/     ai-provider · idb · bus · store · currency · app
/src/utils/    helpers
/src/modules/  dashboard · quoter · items · clients · sales · orders
               pipeline · catalog · marketing · ai · settings
/src/main.js
```

**Conseguenza operativa**: non serve inventare un'architettura. Serve
*ripristinare* quella che il progetto già dichiara e riportarci sopra le patch.

### 2.2 Gli strati di patch

129 blocchi, in ordine cronologico: `v10 → v11 → v17 → v18 → v19 → v20 → v21 → v22
→ v23 → v24 → v25 → v26 → v27 → v28 → v30 → v32 → v33 → v35 → v36 → v37 → v37b →
v37c → v38 → PRO X v2 → PRO X Boost v3 → PRO X v2/v3 → ENTERPRISE V1/V2/V3 →
v54..v58 (Design System) → v60..v74 → v75..v90 → v92 → v96`.

Caratteristiche ricorrenti misurate:

- **Monkey patching a catena**: `var _origRender = X.render.bind(X); X.render = function(){ _origRender(); ... }`.
  Ogni versione riavvolge la precedente. Una funzione può essere avvolta 4–5 volte.
- **Polling invece di eventi**: `function _p(){ if(typeof X==='undefined'){setTimeout(_p,700);return;} ... }`.
  Decine di timer indipendenti che aspettano che qualcosa esista. Costo: latenza
  di avvio non deterministica e ordine di applicazione non garantito.
- **Guardie idempotenti ad-hoc**: `if(X._v37sync) return; X._v37sync=true;`
  Funziona, ma ogni patch inventa la propria convenzione.
- **`setTimeout` come sincronizzazione**: valori magici (400, 600, 700, 1200, 2000 ms).

Il blocco #18 (`v27 PRO X MASTER FIX PATCH`, 68 KB) viene caricato **prima** del
sorgente `/src/core`: patcha oggetti che ancora non esistono, quindi al suo interno
tutto è avvolto in polling. È un sintomo, non una scelta.

### 2.3 Librerie vendorizzate

`Chart.js 4.4.1` · `jsPDF 2.5.1` · `jspdf-autotable 3.8.2` · `html2canvas 1.4.1` ·
`SheetJS xlsx 0.18.5` · `simple-statistics 7.8.3` · `JSZip 3.10.1`.

Scelta corretta e da mantenere: garantiscono il funzionamento offline (doppio click
sul file, nessuna rete). Sono 1,73 MB su cui non va toccato nulla — vanno però
estratte dal sorgente editabile, perché oggi rendono impraticabile qualsiasi
diff/review del codice applicativo.

---

## 3. Problemi trovati

### 3.1 CRITICI — sicurezza

| ID | Problema | Dove | Impatto |
|----|----------|------|---------|
| **S1** | Credenziali master hardcoded nel frontend: `superadmin/admin` e `admin/admin`, con commento `EMERGENCY BYPASS: accesso garantito` | Admin, `doLogin()` | Chiunque apra il file entra come Super Admin. Bypassa anche il brute-force check che sta 5 righe sopra. |
| **S2** | Password in chiaro: il campo si chiama `passwordHash` ma contiene `'admin'`; il confronto è `a.passwordHash === p` | Admin, DB locale | Nessun hashing. Il campo mente sul proprio contenuto. |
| **S3** | Il bypass **riscrive** la password dell'admin esistente (`adm2.passwordHash='admin'`), riattiva l'account e azzera `mustChangePassword` | Admin, `doLogin()` | Una password forte impostata dall'utente viene silenziosamente degradata a `admin` al primo uso del bypass. |
| **S4** | Chiavi API di terze parti (Gemini, Groq, OpenRouter, Anthropic, Stripe) salvate in `localStorage` in chiaro | OS, 8 chiavi `ingly_*_key` | Leggibili da qualsiasi script nella pagina. Accettabile per un tool locale, **non** per una distribuzione SaaS: va documentato e isolato. |
| **S5** | 1.436 assegnazioni `.innerHTML =` con interpolazione diretta di dati utente | OS, ovunque | XSS stored: un nome cliente o una nota con `<img onerror=…>` esegue codice. Nessuna funzione di escaping centralizzata. |
| **S6** | Licenza e piano validati **solo lato client** (`InglyLicense`, `SaaSGate`, `PLAN_MODULES`) | OS | Il gating è UX, non sicurezza. Va detto esplicitamente e non venduto come protezione. |

`S1`–`S3` bloccano la pubblicazione. Vengono corretti in Fase 8 (vedi §7).

### 3.2 ALTI — architettura e stabilità

| ID | Problema | Misura |
|----|----------|-------:|
| **A1** | Duplicazione di `id` HTML nel DOM | **79** id duplicati su 2.835 |
| **A2** | Namespace globale saturo | **309** costanti globali + **317** `window.*` |
| **A3** | Chiavi di storage senza schema né migrazione | **113** chiavi `localStorage` piatte, 1 store IndexedDB |
| **A4** | Un solo store IndexedDB (`pipeline`): tutto il resto è in `localStorage` | limite pratico ~5–10 MB, silenzioso quando si satura |
| **A5** | Gerarchia di navigazione incoerente | 16 gruppi sidebar per 105 sezioni, con 3 gruppi duplicati/vuoti (`ng-sistema` vuoto, `ng-ai-2` e `ng-sistema-2` doppioni) |
| **A6** | Doppio sistema di licensing non allineato | `PLAN_MODULES` (OS) e `PLANS_CFG` (Admin) elencano moduli diversi per lo stesso piano |
| **A7** | Dipendenza CDN residua in un prodotto dichiarato offline-first | 6 CSS esterni (5 librerie icone + Font Awesome) + 1 JS (`ml-kmeans`) + Google Fonts + 1 PNG (`icons8`) |
| **A8** | 5 librerie di icone caricate, **una sola usata** | 974 usi di Font Awesome; 0 usi di Tabler, Phosphor, Remix, Lucide |

`A8` da solo è ~1,2 MB di download e 4 richieste di rete inutili a ogni avvio.

### 3.3 ALTI — design e UI

| ID | Problema | Misura |
|----|----------|-------:|
| **D1** | Colori hardcoded fuori dai token | **8.210** letterali esadecimali nei sorgenti |
| **D2** | Stili inline nel markup | **16.292** attributi `style="…"` |
| **D3** | Layer CSS sovrapposti e concorrenti | v54, v55, v56, v57, v58, v62, v63, v70, v92 + "UI POLISH LAYER (carica per ultimo, vince la cascata)" |
| **D4** | Due sistemi di token in conflitto | `--primary/--bg/--text/…` **e** `--ds-accent/--ds-blue/--ds-success/…` (72 variabili totali, nessuna gerarchia) |
| **D5** | Guerre di specificità | **199** `!important` |
| **D6** | Emoji al posto delle icone | **9.158** emoji nei sorgenti, incluse le etichette di navigazione |
| **D7** | Nessun sistema tipografico | nessuna scala definita; `font-size` inline da 9px a 24px scelti caso per caso |
| **D8** | Palette senza semantica | 786 usi di `#22c55e`, 765 di `#ef4444`, 560 di `#f59e0b` — successo/errore/warning esistono, ma come abitudine, non come token |

Il commento *"carica per ultimo, vince la cascata"* nel blocco v62 è la
formalizzazione del problema: il design non è un sistema, è una gara di priorità.

### 3.4 MEDI — UX e accessibilità

| ID | Problema | Misura |
|----|----------|-------:|
| **U1** | Dialoghi nativi del browser al posto di modali/toast | **55** `alert()` · **145** `confirm()` · **82** `prompt()` |
| **U2** | Handler inline nel markup | **2.543** `onclick="…"` |
| **U3** | Accessibilità assente | **26** attributi ARIA in 9,3 MB · nessun focus trap · nessun `:focus-visible` coerente |
| **U4** | Responsive parziale | 28 media query per 123 viste; le tabelle non hanno strategia di collasso |
| **U5** | Nessuno stato di caricamento standard | nessuno skeleton; i render lunghi bloccano il thread senza feedback |
| **U6** | Lingua mista nell'interfaccia | il modulo Social Studio è in inglese, il resto in italiano; esiste un "layer di traduzione EN a runtime" (blocco 174) che traduce il DOM a posteriori |

`U1` è anche un problema funzionale: `prompt()` è bloccante e non è disponibile
in tutti i contesti di embedding.

### 3.5 Codice morto e duplicazioni verificate

Rimosso in questa fase **solo** ciò che è dimostrabilmente inutilizzato:

| Elemento | Verifica | Azione |
|----------|----------|--------|
| 4 CSS di icone (Tabler, Phosphor, Remix, Lucide) | 0 occorrenze delle rispettive classi in 9,3 MB | rimuovere |
| 61 file `INGLY-OS-v*-STANDALONE.html` nel repo di origine | versioni superate da v96 | non migrare |
| `ml-kmeans` da CDN | usato da 1 funzione di clustering | vendorizzare o sostituire |
| PNG `img.icons8.com` | 1 riferimento, decorativo | sostituire con asset locale |

**Non** viene rimosso nulla che non sia stato verificato. Le 129 patch restano
tutte: il loro contenuto è funzionalità reale, la loro *forma* è il problema.

---

## 4. Cosa mantenere (verificato, ha valore)

- **I 11 moduli di dominio** (`dashboard`, `quoter`, `items`, `clients`, `sales`,
  `orders`, `pipeline`, `catalog`, `marketing`, `ai`, `settings`) — 2,6 MB di logica
  di business reale, testata sul campo.
- **I motori di calcolo**: `LaserCalcV2`, `CalcMacchine` (v4.0), `Print3DQuoter`,
  `RealCostEngine`, `PricingEngine`, `AdvancedCost`, `AutoHourlyRate`. Sono la base
  del Product Builder: **non vanno riscritti né duplicati**.
- **Il seed catalogo**: 128 prodotti reali con costi (251 KB).
- **Market Hub / fornitori / consumabili** (v69, v73): dati reali su materiali
  sublimazione, UV, DTF.
- **Il catalogo macchine enterprise** (v60/v61/v62) con `MachineHub` come single
  source of truth — è già l'impianto giusto per i Work Center.
- **L'intero impianto Admin**: ruoli, matrice permessi 12×6, audit log, anti-sharing,
  gestione sessioni e dispositivi, generatore licenze. Struttura solida.
- **Le librerie vendorizzate**: garantiscono l'offline. Restano.
- **La toolchain del repo di origine**: Vite + `vite-plugin-singlefile`, TypeScript
  strict, 42 file di test, CI GitHub Actions. Va migrata, non reinventata.

---

## 5. Cosa refactorizzare

| Area | Da | A |
|------|----|----|
| Struttura file | 1 HTML da 9 MB | sorgenti separati + build a file singolo |
| Design | 9 layer CSS in cascata | 1 `INGLY DESIGN SYSTEM` a 3 livelli di token |
| Navigazione | 16 gruppi ad accumulo | 7 gruppi gerarchici, 105 sezioni mappate senza perdite |
| Licensing | 2 elenchi divergenti | 1 registro feature-based condiviso OS ↔ Admin |
| Icone | 5 librerie + 9.158 emoji | 1 libreria + set SVG proprietario |
| Dialoghi | `alert`/`confirm`/`prompt` | toast + modal con focus management |
| Colori | 8.210 letterali | token semantici |
| Admin auth | bypass hardcoded | hash + configurazione esterna |

---

## 6. Rischi identificati

| # | Rischio | Probabilità | Impatto | Mitigazione adottata |
|---|---------|-------------|---------|----------------------|
| R1 | Perdere funzionalità durante lo split del monolite | Alta | Critico | **Round-trip byte-identico**: `npm run build` ricostruisce un file con lo stesso SHA-256 dell'originale. Verificato ✔ |
| R2 | Rompere l'ordine di applicazione delle patch | Alta | Critico | L'ordine è dato dal `manifest.json`, non dall'ordine alfabetico dei file. Il build non riordina mai. |
| R3 | Un refactor CSS rompe layout in viste non testate | Alta | Alto | 123 viste: il design system entra come **sostituzione dei token**, non come nuovo layer sopra. Screenshot QA per gruppo di sezioni. |
| R4 | Il fix delle credenziali admin blocca l'accesso all'utente | Media | Alto | Migrazione con primo avvio guidato: crea il super admin al setup, non lo assume esistente. |
| R5 | La rimozione di un `id` duplicato rompe un selettore | Media | Medio | I 79 duplicati vengono affrontati uno per uno con ricerca dei selettori, non con rinomina automatica. |
| R6 | `localStorage` va in quota su laboratori con molti ordini | Media | Alto | Già oggi presente. Documentato; migrazione a IndexedDB pianificata dopo la stabilizzazione UI. |
| R7 | Il layer di traduzione EN a runtime confligge con i nuovi testi | Media | Medio | Sostituito da etichette a chiave nel nav-map. |

---

## 7. Priorità e piano di migrazione

Il criterio è: **prima la rete di sicurezza, poi la struttura, poi l'aspetto**.

| Fase | Contenuto | Reversibile | Stato |
|------|-----------|-------------|-------|
| 0 | Audit + baseline funzionale | — | ✅ |
| 1 | Repository pulita, estrazione, build round-trip verificato | sì (build identico) | ✅ |
| 2 | Toolchain: test, CI, lint dei token | sì | in corso |
| 3 | INGLY Design System — token e componenti | sì (build) | |
| 4 | Sostituzione dei token legacy, rimozione layer duplicati | sì | |
| 5 | App shell + sidebar a 7 gruppi | sì | |
| 6 | Dashboard + Work Center | sì | |
| 7 | Componenti: tabelle, form, modali, toast, stati vuoti | sì | |
| 8 | **Sicurezza Admin** (S1–S3) + INGLY Cloud Admin | sì | |
| 9 | Responsive + accessibilità | sì | |
| 10 | QA visiva, performance, documentazione | — | |

Ogni fase chiude con `npm run check` verde e un commit dedicato.

---

## 8. Decisione architetturale di fondo

> **Non si riscrive. Si decompone lungo i confini che il file già dichiara.**

Il monolite contiene la propria mappa: i marcatori `/src/**` del build originale e
le intestazioni di ogni patch. `scripts/extract.mjs` taglia lungo quelle linee e
`scripts/build.mjs` ricompone. La prova che il taglio è corretto è il round-trip:

```
sha256 build    : d30a1278e4c399ba8cc29044d1ed183b0be11f9aeadfaad657b296d75e836399
sha256 sorgente : d30a1278e4c399ba8cc29044d1ed183b0be11f9aeadfaad657b296d75e836399
IDENTICO al monolite originale ✔
```

Da qui in avanti ogni differenza rispetto al v96 è una **modifica deliberata e
leggibile in un diff**, non un effetto collaterale.

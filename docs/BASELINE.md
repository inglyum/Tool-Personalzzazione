# BASELINE — stato iniziale verificabile

> Fotografia funzionale di partenza. Serve a dimostrare, dopo ogni refactor, che
> nulla di importante è stato perso. I dati vivono in
> `baseline/ingly-os.json` e `baseline/ingly-cloud-admin.json`, rigenerabili con:
>
> ```bash
> npm run baseline
> ```
>
> Il test `tests/baseline.test.mjs` confronta lo stato corrente con questi file e
> fallisce se una sezione, un modulo globale o una chiave di storage spariscono
> senza che la baseline sia stata aggiornata di proposito.

---

## 1. Provenienza e impronte

| Artefatto | SHA-256 | Byte |
|-----------|---------|-----:|
| `INGLY OS v96 STANDALONE.html` | `d30a1278e4c399ba8cc29044d1ed183b0be11f9aeadfaad657b296d75e836399` | 9.363.377 |
| `INGLY OS Enterprise Admin v1.2.html` | `7f43ee9eff4a393df2041d125676dd3efd34a1b544e24a792c66b1f2782c796b` | 334.909 |

Queste impronte sono la definizione di "nessuna perdita": finché
`npm run build` produce file con lo stesso SHA-256, la decomposizione è
puramente strutturale. Da Fase 3 in poi le impronte divergeranno **di proposito**,
e ogni divergenza sarà un commit leggibile.

---

## 2. INGLY OS — inventario

| Grandezza | Valore |
|-----------|-------:|
| File sorgente dopo l'estrazione | 190 |
| Blocchi `<script>` / `<style>` | 176 |
| Sezioni navigabili (`data-section`) | **105** |
| Viste dichiarate (`id="view-…"`) | **123** |
| Oggetti globali (`const X = {`) | **309** |
| Assegnazioni `window.X =` | **317** |
| Chiavi `localStorage` | **113** |
| Object store IndexedDB | 1 (`pipeline`) |
| Librerie vendorizzate | 7 |

### 2.1 Entry point

Il monolite non ha un entry point unico: l'avvio è la somma di
`/src/main.js` (blocco 40) più ~40 IIFE auto-eseguite nelle patch successive,
ciascuna con il proprio polling di attesa. Il *primo* codice eseguito è il
blocco 15 (`v92 — SEED LICENZA OWNER`), che precede persino il core.

### 2.2 Le 105 sezioni

```
ai · aicoach · analytics · apparel · b2bpitch · backup · bank_funds · barcode
bizai · booking · brand_identity · briefing · bu · calendar · cashflow · catalog
clienti · clientintel · clients · cloud_updater · clv · competitormon · competitors
contentperf · crm · crm_pipeline · dashboard · decision · demand_map · dynamicprice
equipment · etsy_pulse · etsy_seo_wizard · etsyai · fiera · finance · fiscal
fixed_costs · forecaster · forecasting · gestione_ordini · goals · growthengine
history · ideas · imagelib · inglydesign · intel · items · kanban · kpi
lab_musthave · lab_setup · laser_b2b · lasercalc · laserresources · leadscorer
legal · listino · live_intel · magazzino · market_agent · market_intel · marketing
marketintel · monthly_report · opportunity · order_tracker · paints
payment_schedule · pdfmonth · photostudio · portabile · price_radar · prima_nota
print3d · product_hunter · profitscope · projects · quoteintel · quoter · recurring
replyai · reports · revsim · sales · sales_archive · scanner · settings · smartnotif
socialproof · socialstudio · stockalert · stockplanner · strategy · supplierintel
suppliers · taxcalendar · team · template_docs · timetracker · trendscanner
weeklyreport · workflow_dashboard · xmlsdi
```

### 2.3 Disallineamenti navigazione ↔ viste (da verificare a runtime)

**28 viste senza voce di menu** — raggiungibili solo via codice:

```
ai-anomaly · ai-clv · ai-dashboard · ai-predictor · ai-reorder · competitor
components · comptrack · contentcalendar · design_studio · etsy · etsy_analytics
etsy_seo · gadgets · innovation · inventory · materials · orders · pipeline
produzione · profitleak · social · social-calendar · studio_ai · supplier_intel
web_presence · workflow · workspace
```

**10 sezioni senza vista statica** — il markup viene creato a runtime
(`el.id = 'view-' + section`), quindi possono essere corrette oppure aprirsi vuote:

```
briefing · crm · crm_pipeline · kanban · magazzino · monthly_report
order_tracker · payment_schedule · prima_nota · stockplanner
```

Di queste, `briefing`, `monthly_report` e `stockplanner` non hanno **alcun**
riferimento a `view-<nome>` nel codice: sono i tre candidati più probabili a
sezione vuota. Verifica a runtime pianificata in `tests/navigation.test.mjs`.

### 2.4 Sidebar di partenza — 16 gruppi

| Gruppo | Etichetta | Sezioni |
|--------|-----------|--------:|
| `ng-ai` | AI Command Center | 7 |
| `ng-intel` | Intelligence & Analytics | 8 |
| `ng-market` | Market Intelligence | 19 |
| `ng-preventivi` | Preventivi | 5 |
| `ng-pipeline` | Gestione Lavori | 7 |
| `ng-stock` | Produzione & Stock | 12 |
| `ng-finance` | Finance & Fiscale | 8 |
| `ng-crm` | CRM & Customer AI | 4 |
| `ng-mkt` | Marketing & Content AI | 5 |
| `ng-ops` | Pianificazione & Ops | 6 |
| `ng-brand` | Brand & Business | 4 |
| `ng-laser` | Risorse Laser | 1 |
| `ng-report` | Report & Export | 5 |
| `ng-sistema` | *(vuoto)* | 0 |
| `ng-ai-2` | 🔮 Previsioni Vendite | 1 *(doppione di `ai`)* |
| `ng-sistema-2` | Storico | 8 *(doppioni)* |

### 2.5 Chiavi di storage — versioni parallele senza migrazione

Tre famiglie mostrano schema drift: il codice legge la versione più recente
ma le precedenti restano nel browser dell'utente.

```
lb2b_catalog_v1   lb2b_catalog_v23   lb2b_catalog_v33
lb2b_machines_v1  lb2b_machines_v32
ingly_settings    ingly_settings_main
```

Nessuna chiave verrà rinominata senza una migrazione esplicita
(vedi `docs/MIGRATION.md`).

### 2.6 Motori di calcolo censiti (da non duplicare)

| Motore | Blocco | Cosa calcola |
|--------|--------|--------------|
| `LaserCalcV2` | 119 (57 KB) | tempi/costi taglio e incisione laser |
| `CalcMacchine` v4.0 | 120 (65 KB) | costo macchina, ammortamento, costo orario |
| `Print3DQuoter` | 108 (35 KB) | tempi/costi stampa 3D, filamento, resina |
| `RealCostEngine` | patch PRO X | costo reale con overhead |
| `PricingEngine` / `AdvancedCost` | core + v37 | listini, ricarichi, sconti quantità |
| `AutoHourlyRate` | patch v30 | tariffa oraria da costi fissi |
| `InglyDomain.quote` | bundle TS | motore preventivo tipizzato (con test) |

Il Product Builder si aggancia a questi. Non ne introduce di nuovi.

### 2.7 Debito misurato (metriche di riferimento per il "prima/dopo")

| Metrica | Baseline |
|---------|---------:|
| Attributi `style="…"` inline | 16.292 |
| `onclick="…"` inline | 2.543 |
| Colori esadecimali letterali | 8.210 |
| `!important` | 199 |
| Emoji nei sorgenti | 9.158 |
| `alert()` / `confirm()` / `prompt()` | 55 / 145 / 82 |
| `id` HTML duplicati | 79 |
| Attributi ARIA | 26 |
| Media query | 28 |
| Assegnazioni `.innerHTML =` | 1.436 |

Ogni fase successiva deve muovere questi numeri nella direzione giusta senza
toccare la colonna delle funzionalità.

---

## 3. INGLY Cloud Admin — inventario

| Grandezza | Valore |
|-----------|-------:|
| Pagine (`data-page`) | 18 |
| Oggetti globali | 8 |
| Chiavi `localStorage` | 10 |
| Attributi `style="…"` inline | 438 |
| Colori esadecimali letterali | 106 |

### 3.1 Pagine di partenza

```
dashboard · users · subscriptions · plans · billing-expiration · license-server
sessions · devices · security · anti-sharing · audit-log · admin-roles
notifications · creations · storage · cloud-settings · architecture · roadmap
```

### 3.2 Modello di autorizzazione (da preservare)

**6 ruoli**: `superadmin`, `admin`, `manager`, `support`, `billing`, `moderator`.

**Matrice permessi 12 × 6** — le 12 capacità:

```
Gestione Utenti · Crea Admin · Billing & Piani · Security Center · Audit Log
Ban Account · Reset Password · Kill Sessions · Export Dati · Notifiche Push
Eliminazione Dati · Anti-Sharing
```

**4 piani** con prezzo, storage e moduli abilitati:

| Piano | € / mese | Storage | Moduli |
|-------|---------:|--------:|-------:|
| Starter | 19 | 2 GB | 28 |
| Pro | 49 | 10 GB | 60 |
| Business | 99 | 50 GB | 85 |
| Enterprise | 199 | 200 GB | 113 (`*`) |

### 3.3 Dati dimostrativi

Utenti, aziende, sessioni e metriche dell'Admin sono **generati** (`makeUser`,
`rndInt`, `daysAgo`). Non sono dati reali e non devono mai essere presentati come
tali: in `docs/ARCHITECTURE.md` il dataset demo viene isolato dietro un flag
esplicito, secondo la regola "no fake data".

---

## 4. Toolchain ereditata dal repository di origine

| Elemento | Stato | Migrata |
|----------|-------|---------|
| Vite + `vite-plugin-singlefile` | funzionante | sì |
| TypeScript strict (`src/core`, `src/domain`, `src/modules`, `src/integrations`) | 24 file | sì |
| Suite test Node/Playwright | 42 file | sì, riadattata |
| CI GitHub Actions (verify → typecheck → build → test) | funzionante | sì |
| 61 `INGLY-OS-v*-STANDALONE.html` (versioni storiche) | superate da v96 | **no** |
| `app-v2/` (secondo applicativo su Supabase) | traccia separata, non parte del prodotto standalone | **no** — resta in `Ingly-standalone-html` |
| `supabase/`, `db/` (schema multi-tenant, RLS) | infrastruttura non ancora attiva | **no** in v1 — vedi `docs/MIGRATION.md` §5 |

Le esclusioni sono decisioni documentate e reversibili: nulla è stato cancellato,
tutto resta nel repository di origine al commit indicato in `docs/MIGRATION.md`.

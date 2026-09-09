# COST ENGINE V2 — AUDIT TECNICO (PHASE 1)

Data: 9 settembre 2026 · ramo `claude/ingly-personalization-repo-ekvc0z`
Repository: `inglyum/Tool-Personalzzazione`
Metodo: misurazione a runtime sul file consegnato `dist/INGLY-OS.html`, non
lettura del sorgente. Nessuna riga di codice modificata in questa fase.

---

## La conclusione, prima delle prove

**Il motore di costo che il comando chiede in gran parte esiste già, ed è
corretto.** Quello che manca non è la matematica: sono i **dati**.

Il comando è scritto come se si partisse da zero — «creare un vero database
economico», «NON usare più un semplice array JavaScript», «implementare
FULL_COST / TARGET_MARGIN / SELLING_PRICE». Misurato, il sistema ha già:
un motore unico con sei profili tecnologia, il prezzo dal margine (non dal
ricarico), il pavimento di margine, la confidenza per singola voce di costo, il
costo orario macchina con ammortamento e consumabili, e la separazione fra
tempo macchina e tempo uomo.

Quello che non ha è altrettanto netto: **nessun prezzo, in nessun catalogo, ha
una fonte o una data**. E due cataloghi importanti — 74 macchine e 87 materiali
— non sono collegati al motore.

Il §50 del comando dice: «Se una formula è corretta: KEEP. Se un dato è
falso/non verificato: REPLACE». Questo audit dice **dove** applicare l'una e
dove l'altra.

---

# A — CURRENT ARCHITECTURE

## A.1 · Dove vivono i dati

Non c'è un database SQL. L'applicazione è un file HTML solo, offline-first:

| Livello | Tecnologia | Contenuto |
| ------- | ---------- | --------- |
| Dati operativi | **IndexedDB** `InglyMasterDB` v31, 58 store | clienti, ordini, catalogo, materiali, attrezzature… |
| Preferenze | `localStorage` | tema, sidebar, chiavi Supabase, scatti locali |
| Cloud | **Supabase** — solo licenze e sincronizzazione | URL e anon key in `localStorage`; non è il magazzino dei costi |
| Migrazioni | moduli JS in `src/core/migrations/` | funzioni **pure**: decidono, non scrivono |

**Conseguenza sul comando:** le sezioni §34-35 (migration Supabase, RLS, tenant
isolation) non si applicano al motore di costo. Non esiste uno schema SQL da
estendere: le tabelle richieste (`materials`, `price_sources`, `suppliers`,
`machine_calibrations`, `packaging_items`, `overhead_profiles`) vanno create
come **store IndexedDB** con una migrazione additiva, non come `ALTER TABLE`.
La disciplina resta la stessa: nessuna migrazione distruttiva.

## A.2 · Il motore di costo

`src/product/cost-engine.js` — **1628 righe, versione 1.2.0**. Non legge il
DOM e non legge `localStorage`: un test lo verifica, perché un motore che legge
lo stato del browser smette di essere riproducibile.

**Sei profili tecnologia** già presenti: `print3d`, `laser`, `uv`, `dtf`,
`sublimation`, `generico`. **27 voci di costo distinte** dichiarate nei profili:

```
blank · capo · carta · energia · extra · film · finitura · hardware ·
inchiostro · macchina · manodopera · manutenzione · maschera · mascheratura ·
materiale · overhead · packaging · polvere · postProcesso · primaStampa ·
primer · profilo · provaTaglio · scarto · servizi · setup · supporto
```

L'anatomia è quella che il comando chiede: costi **una tantum** (si pagano una
volta per lavoro, si dividono per la quantità) e costi **per pezzo**. Il prezzo
scende con la quantità perché l'avviamento si spalma, non perché si applica uno
sconto — che è esattamente il punto del §39.7.

Moduli satellite, tutti già in produzione:

| File | Righe | Ruolo |
| ---- | ----: | ----- |
| `cost-engine.js` | 1628 | il motore: profili, voci, prezzo, avvisi, confidenza |
| `material-cost.js` | 546 | costo materiale per tecnologia e unità |
| `machine-cost.js` | 274 | costo orario macchina |
| `quote-adapter.js` | 355 | dal preventivo al motore e ritorno |
| `quoter3d-view.js` | 334 | la vista del preventivatore 3D |
| `print3d-cost.js` | 210 | ponte 3D |
| `work-center.js` | 192 | centri di lavoro |
| `pricing-policies.js` | 89 | le politiche, conservate fuori dal motore |
| `inventory-cost-resolver.js` | — | costo reale dal registro di magazzino |

## A.3 · Il prezzo (§22) — già corretto

Misurato in `cost-engine.js:887`:

```js
if (strategia === 'margine') {
  var m = frazione(o.marginePct != null ? o.marginePct / 100 : 0.4);
  netto = m >= 1 ? c : c / (1 - m);   // margine 100% non esiste
}
```

`FULL_COST / (1 - TARGET_MARGIN)` — la formula del §1, già implementata, con
cinque strategie dichiarate (`margine`, `ricarico`, `fisso`, `competitivo`,
`premium`) e **margine e ricarico tenuti distinti**, che è la richiesta del §22.

Il **pavimento del §23** esiste (`cost-engine.js:912`): nessuna combinazione di
sconti porta il prezzo sotto il margine minimo dichiarato, e quando scatta lo
dichiara. Il minimo assoluto è 10%.

Sette politiche, con margine obiettivo, sconto massimo e margine di pavimento:

| Politica | Margine | Sconto max | Pavimento |
| -------- | ------: | ---------: | --------: |
| Ingrosso | 20% | 25% | 12% |
| Competitivo | 25% | 10% | 12% |
| B2B | 30% | 20% | 15% |
| Standard | 40% | 15% | 20% |
| Premium | 60% | 20% | 30% |
| Luxury | 80% | 25% | 45% |
| Su misura | 40% | 100% | 10% |

Sono i «livelli di prezzo» del §2, con un nome diverso.

## A.4 · Il costo orario macchina (§11) — già corretto

`machine-cost.js:93` calcola:

- **energia** — con priorità dichiarata: `measuredPowerW` → `averagePowerW` →
  `ratedPowerW × dutyCycle` → assente. È la gerarchia del §44, già presente;
- **ammortamento** — `(investimento − valore residuo) / vita utile in ore`,
  con l'investimento che comprende spedizione, installazione e accessori
  (§11), e l'IVA scorporata quando dichiarata;
- **manutenzione** — per ora **oppure** annuale ripartita, «mai tutte e due»;
- **consumabili** — ognuno con il proprio intervallo di sostituzione, perché
  un ugello ogni 300 ore e un filtro ogni 2000 non sono la stessa spesa.

Ogni ramo abbassa la confidenza e produce un avviso quando il dato manca. È il
§27 e il §28, già implementati.

## A.5 · Confidenza e provenienza (§27) — presenti nel motore

Cinque livelli, nell'ordine del comando:
`measured` → `verified` → `declared` → `estimated` → `missing`.

Il motore attribuisce una provenienza **a ogni singola voce di costo**
(`cost-engine.js:811`) e la confidenza complessiva è la peggiore fra quelle
delle voci che pesano (`cost-engine.js:857`). Un dato mancante **non blocca il
preventivo**: abbassa la confidenza e produce un avviso — §28, già rispettato.

## A.6 · I preventivatori

Cinque rotte. Quattro passano dal motore unico, una no:

| Rotta | Modulo | Motore unico |
| ----- | ------ | ------------ |
| `print3d` | `Print3DQuoter` | **sì** |
| `laser_b2b` | `LaserB2B` | **sì** |
| `apparel` | `ApparelQuoter` | **sì** |
| `quoter` | `Quoter` | **sì** (via `InglyQuoteAdapter`) |
| `lasercalc` | `CalcMacchine` | **no** |

## A.7 · I cataloghi, misurati su installazione nuova

Numeri letti a runtime, non dal sorgente:

Misura ripetuta su **due profili browser nuovi**, risultato identico:

| Store IndexedDB | Record dopo il primo avvio |
| --------------- | -------------------------: |
| `materials` | **172** — di cui 162 `type:'material'`, **6 `type:'machine'`**, 4 senza tipo |
| `catalog` | 70 |
| `gadgets` | 61 |
| `fixed_costs` | 10 |
| `inventory` | 4 |
| `equipment` | **0** |
| `suppliers` | **0** |
| `items` · `components` · `paints` · `laser_resources` · `inventory_ledger` | **0** |

E i cataloghi **non persistiti**, scritti dentro il codice:

| Dove | Contenuto | Visto dal motore |
| ---- | --------- | ---------------- |
| `CalcMacchine` (patch 120) | **74 macchine** con `price`, `life_h`, `kw`, `maint`, `power_w`, `speed_cut`, `speed_engr` | **no** |
| `materials` (store) | 6 macchine con `type:'machine'`, nello store dei materiali | no — il motore cerca in `equipment` |
| `Print3DQuoter.MACH` (patch 108) | 19 modelli 3D | sì, come listino |
| `Print3DQuoter.DEF_MATS` | 14 materiali 3D | sì, come ripiego |
| `LaserB2B._MACHINES` | 6 macchine laser | sì |
| `Materials.DEFAULTS` (items) | 87 materiali + 6 macchine | sì, via `materials` |

---

# B — PROBLEMS

Otto problemi, tutti misurati. In ordine di danno economico.

### P-1 · Nessun prezzo ha una fonte, e nessuno ha una data

Cercati nei tre cataloghi più grandi i campi che il §33 richiede:

| Campo | `items` (87 mat.) | `CalcMacchine` (74 macc.) | `Quoter 3D` |
| ----- | ----------------: | ------------------------: | ----------: |
| `source_url` | 0 | 0 | 0 |
| `source_name` | 0 | 0 | 0 |
| `checked_at` / `priceDate` | 0 | 0 | 0 |
| `confidence` | 0 | 0 | 9 (nel codice, non nei dati) |
| `supplierUrl` | 170 | 0 | 0 |

Il materiale porta il **link del fornitore** ma non il **prezzo verificato**:
non si può sapere se «€ 13,20/mq» è di ieri o di due anni fa. Il motore sa
dichiarare la confidenza, ma non ha niente da leggere: la calcola da *quale
campo è popolato*, non da *quanto è affidabile quel campo*.

**È il problema numero uno.** Tutto il resto del comando — landed cost,
confronto fornitori, storico prezzi, priorità Palermo/Sicilia — poggia su un
campo che non esiste.

### P-2 · 74 macchine con dati tecnici reali, invisibili al motore

`CalcMacchine` porta 74 macchine con prezzo d'acquisto, vita utile in ore,
assorbimento in kW, manutenzione oraria e velocità di taglio/incisione. Il
motore di costo non le vede: legge lo store `equipment`, che su installazione
nuova ha **zero record**.

Due cataloghi per lo stesso concetto, e quello ricco è quello scollegato. È il
difetto ricorrente di questo progetto — «due sistemi che possiedono un
concetto solo» — nella sua forma più costosa: il preventivatore usa i
predefiniti generici mentre il dato buono è a due schermate di distanza.

### P-3 · `lasercalc` calcola con un ricarico, non con un margine

`CalcMacchine` usa `markup: 3.5` e fa `unitCost × markup`. È esattamente ciò
che il §22 vieta: su un costo di € 20 dà € 70 (margine reale 71,4%), mentre il
resto dell'applicazione con margine 40% darebbe € 33,33. Due prezzi per lo
stesso lavoro, a seconda della schermata aperta.

### P-4 · Su installazione nuova non esiste nessuna macchina — e sei sono nel posto sbagliato

`equipment: 0`. Il preventivatore 3D e quello laser partono con i parametri
predefiniti del modulo — € 420 di macchina, 3000 ore di vita, 0,12 €/h di
manutenzione — che sono un ripiego dichiarato, non il laboratorio di INGLY.
Finché il parco non viene registrato, **ogni preventivo è costato su una
macchina che non esiste**.

E c'è un dettaglio che chiude il cerchio con P-2: **sei macchine esistono
davvero, ma stanno dentro `materials` con `type: 'machine'`**, non in
`equipment`. Quindi le macchine, su una installazione nuova, stanno in **tre
posti** — 74 dentro `CalcMacchine`, 6 dentro `materials`, 19 come listino nel
quoter 3D — e lo store che il motore di costo interroga è l'unico vuoto.

### P-5 · Overhead e sfrido restano a zero

Misurato sul caso reale (sotto): `overheadPerHour = 0`, `overheadPct = 0`,
`overheadPerJob = 0`, `materialWasteRate = 0`. Il motore sa gestirli tutti e
tre (e sa che non vanno sommati fra loro, §21), ma non c'è un profilo overhead
da cui leggerli. Affitto, corrente di struttura, software e amministrazione
non entrano in nessun preventivo.

### P-6 · Non esistono fornitori

`suppliers: 0`. Senza fornitori non c'è landed cost (§5), non c'è confronto
(§30) e non c'è priorità geografica (§31). Il `supplierUrl` sui materiali è
una stringa, non una relazione.

### P-7 · Manca il catalogo dei blank (§17)

`gadgets: 61` è la cosa più vicina, ma non ha né costo d'acquisto strutturato
né fornitore né area di personalizzazione. Il §18 (product cost profile) non ha
su cosa poggiare.

### P-8 · Mancano moltiplicatore di complessità e costo del design

Zero occorrenze di `complexity` e `designCost` nel motore. Il §24 e il §25 non
sono implementati: il tempo di progettazione, oggi, o è dentro il setup o non
c'è.

---

## B.1 · Il caso del §37, misurato

Il comando chiede di verificare il caso «9h57 / 250 g PLA produce un prezzo
irrealistico». Misurato sul file consegnato:

**Ingresso:** 250 g · 9,95 h · 1 pezzo · filamento € 24/kg su bobina da 1000 g ·
150 W di targa con ciclo di lavoro 0,6 · € 0,28/kWh · macchina € 420 / 3000 h ·
manutenzione € 0,12/h · manodopera € 18/h · avviamento 15 min · finitura 5 min ·
fallimenti 7%.

| Voce | Valore | Verifica |
| ---- | -----: | -------- |
| Materiale | € 6,000 | 250 g ÷ 1000 × € 24 ✓ |
| Energia | € 0,251 | 150 W × 0,6 = 90 W × 9,95 h = 0,8955 kWh × € 0,28 ✓ |
| Ammortamento macchina | € 1,393 | € 420 ÷ 3000 h × 9,95 h ✓ |
| Manutenzione | € 1,194 | € 0,12/h × 9,95 h ✓ |
| Finitura | € 1,500 | 5 min ÷ 60 × € 18/h ✓ |
| Scarto previsto | € 0,665 | 7% sul perdibile ✓ |
| Avviamento (una tantum) | € 4,500 | 15 min ÷ 60 × € 18/h ✓ |
| **Overhead** | **€ 0,000** | **non configurato** |
| **COSTO PIENO** | **€ 15,503** | |
| Prezzo netto (margine 40%) | € 25,838 | 15,503 ÷ (1 − 0,40) ✓ |
| Confidenza | `estimated` | |
| Avviso già emesso | «Manca il costo del materiale: il costo esce più basso del reale» | |

**Ogni singola riga è aritmeticamente corretta.** Il prezzo «irrealistico» non
nasce da una formula sbagliata: nasce da **tre dati assenti e quattro
predefiniti**. Overhead a zero, sfrido a zero, imballo assente; e macchina,
materiale, manutenzione e manodopera presi dai valori di ripiego del modulo.

Il sistema lo dice già — confidenza `estimated`, avviso sul materiale — ma lo
dice piano, e chi guarda il numero non guarda l'avviso.

**Che cosa cambierebbe con dati veri** (illustrativo, con parametri da
verificare in PHASE 2, non ancora misurati):
se la macchina fosse una stampante reale con il suo prezzo d'acquisto e la sua
vita utile, se il filamento avesse il prezzo pagato in fattura con la
spedizione, e se l'overhead fosse ripartito, il costo pieno si muoverebbe.
**Di quanto, non lo so ancora, e non lo scrivo finché non ho i dati.**

---

# C — DATA MODEL (cosa manca)

Sette store nuovi, additivi. Nessuno tocca dati esistenti.

| Store | Chiave | Perché | Copre |
| ----- | ------ | ------ | ----- |
| `price_sources` | `id` | il prezzo con URL, data, quantità, IVA, spedizione | §4, §33 |
| `suppliers` | `id` | fornitore con città/provincia/regione, ritiro locale | §5, §31 |
| `machine_calibrations` | `id` | misura reale di consumo per macchina e processo | §13 |
| `packaging_items` | `id` | imballo con costo unitario | §19 |
| `labor_profiles` | `id` | profili operatore: costo interno ≠ tariffa cliente | §20 |
| `overhead_profiles` | `id` | affitto, software, ammortamenti di struttura | §21 |
| `blanks` | `id` | prodotti grezzi personalizzabili con area di stampa | §17, §18 |

E **campi nuovi su store esistenti**, aggiunti senza rimuovere nulla:

- `materials`: `supplier_id`, `purchase_price_net`, `vat_rate`, `shipping_cost`,
  `moq`, `waste_rate`, `price_per_kg` / `_m2` / `_meter` / `_piece`,
  `source_url`, `source_name`, `source_date`, `source_type`, `confidence`;
- `equipment`: `residual_value`, `expected_annual_hours`, `consumables[]`,
  `measured_power_w`, `rated_power_w`, `duty_cycle`, `source_*`;
- `catalog`: `cost_profile_id`, `blank_id`, `target_margin`, i livelli di
  prezzo (B2C / B2B / ingrosso).

**Il landed cost** (§5) è una funzione, non un campo:
`LANDED = purchase_net + shipping_ripartita + altri costi diretti`, calcolata
sulla quantità dichiarata nella fonte. Va nel motore, non nei dati, così resta
una sola definizione.

---

# D — MARKET RESEARCH (piano, non risultati)

Il §6 chiede prezzi reali 2026 con URL. **In questa fase non ne ho raccolto
nessuno**, e non ne invento: il §43 è esplicito, e la mia conoscenza si ferma a
maggio 2026 — un prezzo «ricordato» sarebbe un prezzo inventato con una data
falsa.

Protocollo per PHASE 2, in ordine di priorità (§45):

1. **fattura INGLY** — se esiste, batte tutto: `confidence: measured`;
2. **preventivo fornitore locale** (Palermo/Sicilia): `verified`;
3. **listino ufficiale del produttore**: `verified`;
4. **distributore italiano**: `declared`;
5. **e-commerce verificato**, con URL e data di consultazione: `declared`;
6. **stima**: `estimated`, e dichiarata tale.

Ogni record avrà `source_url`, `source_name`, `checked_at`, `quantity`, `unit`,
`vat_included`, `shipping`. **Un prezzo senza URL non entra come `verified`.**

Categorie da coprire, con il target del §32: 150 materiali, 100 blank, 20
profili macchina, 30 consumabili, 20 fornitori. Dichiaro fin d'ora che il
target quantitativo **non giustifica** record inventati: se una categoria non
si verifica, resta con `confidence: missing` e il conteggio resta sotto il
target.

---

# E — MIGRATION PLAN

Cinque regole, tutte già in uso in questo repository.

1. **Additivo.** Gli store nuovi nascono vuoti. Nessun record esistente viene
   riscritto o cancellato. `IndexedDB` passa da v31 a v32 con soli
   `createObjectStore`.
2. **Nessun secondo motore.** Si estende `InglyCostEngine`, non se ne affianca
   un altro. Il §0 lo vieta e il progetto ha già pagato quel prezzo.
3. **I predefiniti restano come ripiego dichiarato.** Il §36 vieta il fallback
   silenzioso, non il fallback: quando si usa un valore di ripiego, la voce
   esce con `confidence: estimated` e la scritta «predefinito».
4. **Migrazione come funzione pura.** Decide, non scrive; chi la chiama applica
   e verifica i conteggi — il modello di `pipeline-to-orders.js`.
5. **Ogni file storico modificato va dichiarato** in
   `baseline/deliberate-changes.json`, con la ragione. Lo verifica
   `tests/roundtrip.test.mjs`.

Su Supabase: **non si tocca**. Non è il magazzino dei costi, e aprirlo qui
significherebbe introdurre tenant isolation e RLS in una fase che non lo
richiede. Se in futuro il catalogo di mercato diventerà condiviso, sarà una
fase sua.

---

# F — IMPLEMENTATION PLAN

Ordine di esecuzione, rivisto sulla base di ciò che esiste davvero. Le fasi del
comando che risultano già implementate sono marcate **KEEP**.

| # | Fase | Stato | Contenuto |
| - | ---- | ----- | --------- |
| 1 | Audit | **fatto** | questo documento |
| 2 | Ricerca di mercato | da fare | prezzi con URL e data; nessun numero senza fonte |
| 3 | Modello dati | da fare | 7 store nuovi + campi additivi; migrazione v31→v32 |
| 4 | ~~Supabase~~ | **non applicabile** | i costi non stanno su Supabase |
| 5 | Seed dati di mercato | da fare | solo record verificati; il resto `missing` |
| 6 | Profili macchina | **parziale** | il motore c'è (KEEP); mancano i dati e il collegamento di `CalcMacchine` |
| 7 | Motore materiali | **parziale** | `material-cost.js` c'è (KEEP); manca il landed cost |
| 8 | Manodopera + overhead | da fare | due store nuovi; il motore li accetta già |
| 9-12 | Motori laser/UV/3D/DTF | **KEEP** | i quattro profili esistono e sono corretti |
| 13 | Catalogo prodotti | da fare | `blanks` + `cost_profile_id` sul catalogo |
| 14 | Motore di prezzo | **KEEP** | margine, pavimento, IVA, commissioni: già corretti |
| 15 | Integrazione Smart Quoter | parziale | i quattro quoter passano dal motore; manca `lasercalc` |
| 16-17 | Test e regressione | da fare | 30 casi economici sul motore, in `npm test` |
| 18 | Audit finale | da fare | confronto prima/dopo sul caso 250 g |

**Il primo intervento che cambia davvero i numeri non è il codice: è il dato.**
Registrare le macchine reali di INGLY con prezzo, vita utile e consumo misurato
sposta il costo di ogni preventivo più di qualunque rifattorizzazione.

---

## Che cosa NON farò, e perché

- **Non riscrivo il motore.** È corretto dove il comando teme che sia
  sbagliato. Riscriverlo violerebbe il §50.
- **Non invento prezzi** per arrivare a 150 materiali. Il §32 chiede un
  catalogo strutturato, il §43 vieta di inventare: quando si scontrano, vince
  il §43.
- **Non tocco Supabase.** Non contiene i costi.
- **Non elimino i cataloghi hard-coded** finché i dati veri non sono dentro:
  restano come ripiego dichiarato, non come verità silenziosa.

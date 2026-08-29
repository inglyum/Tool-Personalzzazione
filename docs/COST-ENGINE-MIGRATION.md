# COST-ENGINE-MIGRATION — inventario dei motori e stato del consolidamento

`InglyCostEngine` è l'unico motore matematico ufficiale. Questo documento dice
chi ci è già passato, chi no, e con quale punto di ingresso.

Lo stato si rimisura, non si dichiara:

```bash
node scripts/audit-cost-engines.mjs          # riepilogo
node scripts/audit-cost-engines.mjs --json   # dettaglio con i file
node --test tests/architecture-cost-engine.test.mjs
```

---

## Inventario

| Motore legacy | File | Funzione | Utilizzatore | Nuovo ingresso | Stato |
|---|---|---|---|---|---|
| `InglyPrint3D` | `src/product/print3d-cost.js` | `cost()` | Smart Quoter 3D (patch 108), Product Builder | `InglyCostEngine.calcola({tecnologia:'print3d'})` + `prezzo()` | **convertito in adapter** |
| `PricingEngine` | `app/src/modules/catalog/index.js` | `suggest()` | Catalogo, Product Builder (`src/product/data.js`) | `calcola({tecnologia:'generico'})` + `prezzo({strategia:'ricarico'})` | **convertito in adapter** |
| `ApparelQuoter` | `patches/069-smart-quote-apparel…` | `calcLine()`, `calcQuote()` | Smart Quote Apparel | `calcola({tecnologia:'generico'})` + `prezzo({marginePavimentoPct})` | **migrato** |
| `LaserB2B` | `patches/096-…laserb2b-master-consolidato` | `_calcV32()` | Laser Quoter B2B | `calcola({tecnologia:'generico'})` + `prezzo({strategia:'ricarico'})` | **migrato** |
| `LaserCalcV2` | `patches/119-…calcolatore-macchina-laser-v2-0` | — | Calcolatore macchina | `calcola({tecnologia:'laser'})` | da fare |
| `Print3DQuoter` | `patches/108-var-print3dquoter-function` | legge i campi e disegna | Smart Quoter 3D | già passa da `InglyPrint3D` | **indiretto** |
| Listini B2B | `app/src/modules/catalog/index.js` | `campPrice`/`kitPrice`/`stockPrice` | Catalogo B2B | `prezzo({strategia:'margine'})` con pavimento | da fare |
| Preventivi | `app/src/modules/quoter/index.js` | 43 letture dal DOM | Smart Quoter | `calcola()` + `explain()` | da fare |

---

## Il modello del passaggio

Nessun motore è stato cancellato. Ognuno è diventato un **adapter**: prende
l'input nella forma che i suoi chiamanti conoscono, chiama il motore, e
restituisce il risultato nella forma che le sue schermate si aspettano.

```
vecchio modulo  →  adapter (stessa firma)  →  InglyCostEngine
```

È la ragione per cui la migrazione non ha rotto nulla: **nessun chiamante è
stato toccato**. `Print3DQuoter`, il Catalogo e il Product Builder non sanno
che il motore sotto è cambiato.

### La prova che i numeri non sono cambiati

Prima di sostituire il calcolatore 3D sono stati generati **200 casi
deterministici** e catturati i risultati. Dopo la sostituzione, gli stessi 200
casi sono stati rieseguiti:

```
casi confrontati  : 200
costi diversi     : 0
voci diverse      : 0
prezzi diversi    : 0
scarto massimo    : 0.000e+0
```

I 30 test storici di `print3d-cost.test.mjs` passano invariati attraverso
l'adapter. Lo stesso per `PricingEngine`: stesso ricarico, stesso netto, stesso
lordo, stesso margine.

### Dove invece i numeri **sono** cambiati, e perché

Nel modulo apparel il conto era sbagliato, quindi il passaggio lo corregge:

| | prima | dopo |
|---|---|---|
| Margine reale a 200 pezzi | **−5,0%** (sotto costo) | 11,8% |
| «Margine 40%» restituiva | 28,6% | 40,0% |
| Serigrafia, avviamento 40 € | 3,20 €/pz a qualunque quantità | 40 €/pz a 1, 0,20 €/pz a 200 |
| Sconto globale del 60% | portava sotto costo | ridotto a 11,1%, margine 10% protetto |

`setupCost` parte da **zero** per ogni tecnica: chi non lo dichiara non trova un
numero inventato nel proprio preventivo.

---

## Politiche di prezzo trovate scritte nel codice

La ricerca dei moltiplicatori distingue due cose che si somigliano:

- **formula legacy** — matematica che deve passare al motore;
- **politica di prezzo** — una decisione commerciale travestita da costante.

Trovate e nominate in `LaserB2B`, dove erano dentro la formula:

| Era | Ora | Cosa significa |
|---|---|---|
| `Math.max(15, …)` | `POLITICHE.prezzoMinimo` | sotto 15 € un lavoro non si apre |
| `cfg.express ? 1.25 : 1` | `POLITICHE.maggiorazioneExpress` | urgenza sotto le 48 ore, +25% |
| `0.65 * (fp)` | `POLITICHE.quotaRivenditore` | quota riconosciuta al rivenditore |
| *(assente)* | `POLITICHE.marginePavimento` | nessuno sconto scende sotto il 15% |

Sono sovrascrivibili da `cfg.politiche`: erano scelte commerciali, e adesso si
possono cambiare senza toccare una formula.

---

## Cosa resta

**55 file** hanno ancora una propria matematica di prezzo. Il numero è
presidiato da un cricchetto in `tests/architecture-cost-engine.test.mjs`: non
può crescere. Ogni nuovo posto in cui qualcuno riscrive una formula fa fallire
il test.

I prossimi per peso reale:

1. `app/src/modules/quoter/index.js` — 43 valori letti dal DOM per calcolare
2. `app/src/modules/catalog/index.js` — listini B2B, ancora fuori dal motore
3. `patches/119-…calcolatore-macchina-laser` — profilo `laser` già pronto
4. `app/src/modules/items/index.js` e `sales/index.js`

# Il dato economico dal preventivo al report — mappa completa

Fase 30A. Ogni punto è stato letto nel sorgente e, dove indicato, misurato a
runtime sul file consegnato. L'audit del solo `Pipeline.confirm` è in
`docs/ORDER-SNAPSHOT-AUDIT-BEFORE.md`; questo copre la catena intera.

---

## 1. La catena, punto per punto

| # | Dove | File | Cosa succede al dato economico | Stato |
| - | ---- | ---- | ------------------------------ | ----- |
| 1 | Smart Quoter — inserimento riga | `mod:quoter/index.js:818` | **creato**: `{cat, desc, unitCost, qty, subtotal}`. La riga è una voce sola con una natura dichiarata, non una scomposizione | ok |
| 2 | Calcolo | `src/product/quote-adapter.js` → `cost-engine.js` | **trasformato**: unico punto di calcolo. Nessuna formula di prezzo resta nel modulo che disegna | ok |
| 3 | Ripartizione sulle righe | `quote-adapter.js` · `calculateQuote` | **trasformato**: prezzo e costo attribuiti riga per riga | **corretto in questa fase** (§3) |
| 4 | Salvataggio preventivo | `mod:quoter/index.js:948` | **serializzato**: `q.economicSnapshot` congelato qui, dove il calcolo esiste ancora | ok |
| 5 | Riapertura preventivo | `mod:quoter/index.js:1658`, `mod:orders/index.js:90`, `mod:items/index.js:2208` | **letto**: il ricarico tornava indietro sbagliato di un fattore 100 | **corretto** (Fase 30) |
| 6 | Conferma → ordine | `mod:orders/index.js` · `Pipeline.confirm` | **serializzato**: lo snapshot passa all'ordine per copia profonda + `economicLog` | ok |
| 7 | Conferma → vendita | `mod:orders/index.js` · stessa funzione | **serializzato**: `sale.amount` e `sale.materialCost`, due numeri | **aperto** (§4) |
| 8 | Ordine — modale | `mod:orders/index.js` · `Orders.openDetail` | **visualizzato**: pannello «Economia dell'ordine», solo snapshot | ok |
| 9 | Ordine — drawer | `mod:orders/index.js` · `_drawerTabOverview` | **visualizzato**: stesso pannello | ok |
| 10 | Kanban, liste, gruppi | `mod:orders/index.js:367,401,442,1483,1536,1623` | **visualizzato**: somme di `o.value \|\| o.total` | ok, è un totale (§4) |
| 11 | Ordine → vendita manuale | `mod:orders/index.js:576` | **trasformato**: `amount: +o.value` | ok, è un totale |
| 12 | Report redditività | `mod:sales/index.js:2097,2124` | **letto**: somma `s.materialCost` e `s.amount` | **aperto** (§4) |
| 13 | Margine reale per vendita | `mod:sales/index.js:2809` | **letto**: `realCostByOrder` dai `cost_entries` | ok, sono costi consuntivi registrati |
| 14 | Dashboard AI | `mod:ai/index.js:121,1138` | **letto**: margine da `rev`/`cost` correnti | **aperto** (§4) |
| 15 | Ricalcolo esplicito | `src/product/order-economics.js` · `chiediRicalcolo` | **trasformato**, su richiesta: mostra il delta, sostituisce solo dopo conferma, registra `ORDER_RECALCULATED` | ok |

## 2. Dove il motore **non** entra

Presidiato da `scripts/audit-historical-pricing.mjs`, con controllo negativo
eseguito (una chiamata all'adapter dentro `pannello()` fa uscire l'audit con
codice 1).

Dodici viste storiche censite; due eccezioni, nominate una per una:
`chiediRicalcolo` e `statoDaPreventivo`. Un'eccezione senza nome sarebbe un
buco.

## 3. Il difetto trovato durante questo audit — le righe non sommavano

Cercando come scomporre il costo per riga si è misurato che la ripartizione
era sbagliata alla radice.

`calculateQuote` prendeva la quota di ogni riga sul **costo del pezzo**:

```js
var quota = c.costoPezzo > 0 ? r.value / c.costoPezzo : 0;   // ← denominatore sbagliato
```

`costoPezzo` comprende avviamento, spese generali e scarto, che non
appartengono a nessuna riga in particolare. I numeratori erano i costi diretti
delle righe, il denominatore era più grande, e le quote non sommavano a uno.

Misurato su un lavoro con 40 € di avviamento e 32 € di spese generali:

| | prima | dopo |
| - | ----- | ---- |
| preventivo (netto) | 170,93 € | 170,93 € |
| somma dei prezzi di riga | **50,16 €** | 170,93 € |
| differenza | **120,77 € — il 70,7%** | 0,00 € |

Nessuno se n'era accorto perché il totale a schermo arrivava da una strada e
le righe da un'altra: è lo stesso schema del resto del progetto, due sistemi
che rispondono alla stessa domanda senza incontrarsi mai.

La correzione prende la quota sul **costo diretto delle righe**, così le quote
sommano a uno per costruzione. Ne discendono, senza altra aritmetica:

- i prezzi di riga sommano al netto;
- i costi attribuiti sommano al costo totale;
- il margine di riga coincide con il margine dell'ordine.

Verificato su tutti e cinquanta i golden order (`tests/golden-orders.test.mjs`).

## 4. Quello che resta aperto, dichiarato

**(a) La vendita porta due numeri, non il conto.**
`Pipeline.confirm` scrive `sale.amount` e `sale.materialCost`. Sono congelati —
copiati dal preventivo, non riletti — quindi i report **non** mostrano costi
correnti su vendite passate. Ma sono un totale: il report di redditività
(`mod:sales/index.js:2097`) può dire *quanto*, non *perché*.

Non è un blocker dello storico economico: è il limite del report. Si chiude
collegando la vendita allo snapshot dell'ordine (`sale.originOrder` esiste già)
invece di duplicare i numeri — lavoro della fase di consolidamento dei report,
non di questa.

**(b) La dashboard AI calcola il margine dai valori correnti.**
`mod:ai/index.js:121` e `:1138` fanno `(rev − cost) / rev` su record correnti.
Non leggono ordini storici, quindi non falsificano uno storico; restano da
migrare al motore come tutto il resto (categoria PRICING dell'audit residui).

**(c) La riga di preventivo non ha un riferimento all'articolo.**
È il limite dichiarato a schermo dal ricalcolo, ed è il blocker #2
(inventory transaction ledger). Finché non esiste, un rincaro del materiale non
può entrare in nessun confronto — e dirlo è meglio che mostrare un delta che
sembra completo e non lo è.

## 5. Cosa conserva una riga d'ordine, e cosa no

Il modello reale, non quello desiderato.

**Conservato per riga** — `tests/golden-orders.test.mjs`:

`itemSnapshot` (id, sku, nome, descrizione, categoria, unità, materiale e
macchina con **nome** oltre all'id), `quantity`, `unitCostSnapshot`,
`unitPriceSnapshot`, `subtotalSnapshot`, `totalCostSnapshot`, `costBreakdown`,
`costTotal`, `costBreakdownResidual`, `discountPct`, `lineSubtotal`,
`finalPrice`, `marginValue`, `marginPercent`, `markupSnapshot`,
`pricingPolicy`, `pricingProfile`, `calculationVersion`, `capturedAt`.

**`costBreakdown`, voce per voce**, ognuna con `source` e `basis`:

| voce | fonte | come |
| ---- | ----- | ---- |
| `materialCost` / `laborCost` / `machineCost` / `energyCost` / … | `misurato` | la natura dichiarata sulla riga |
| `directCost` | `misurato` | quando la natura non è dichiarata |
| `wasteCost` | `misurato` | quota della riga sullo scarto che il motore ha calcolato |
| `setupCost` | `ripartito` | quota di costo della riga, dichiarata in percentuale |
| `overheadCost` | `ripartito` | idem |

**Non conservato, e perché.** Una riga di preventivo *è già una voce sola*:
«Manodopera 40 min», «MDF 3 mm», «Laser 12 min». Non contiene dentro di sé
materiale, energia, macchina e lavoro da separare — è uno dei quattro.
Riempire tutti e quattro i campi su ogni riga significherebbe scrivere tre zeri
e un numero, e i tre zeri direbbero «questa riga non consuma energia» quando la
verità è «di questa riga non è mai stata dichiarata l'energia».

Sono due informazioni diverse, e il progetto ha già deciso da che parte stare:
**le voci non pertinenti restano assenti, non a zero.** Quando la riga arriva da
un profilo tecnologico — Smart Quoter 3D, laser, Product Builder — la
scomposizione vera esiste e viene conservata così com'è.

## 6. Criteri di accettazione del blocker #1

| Criterio | Esito | Prova |
| -------- | ----- | ----- |
| ogni OrderLine possiede snapshot economico | **PASS** | `golden-orders` · 50 ordini |
| snapshot immutabile | **PASS** | `order-snapshot` §2 · controllo negativo rosso su 9 test |
| preventivo e ordine indipendenti | **PASS** | `golden-orders` · sicurezza dei riferimenti, 6 casi |
| modifica CostEngine non altera ordini storici | **PASS** | `calculationVersion` congelata; 50 golden |
| modifica prezzi materiali non altera ordini storici | **PASS** | 26 mutazioni + 50 golden, ognuna con controllo negativo |
| modifica policy non altera ordini storici | **PASS** | `pricingPolicySnapshot` congelato |
| Product Builder / Catalog non alterano ordini storici | **PASS** | `audit-historical-pricing` · nessuna vista storica chiama un motore |
| Order Detail legge lo snapshot | **PASS** | `storico-economico.mjs` sul file consegnato |
| storico conserva margine / costo / prezzo / quantità / policy | **PASS** | `golden-orders`, campo per campo |
| golden tests verdi | **PASS** | 50 ordini + 152 controlli di somma |
| deep clone tests verdi | **PASS** | 6 casi, bidirezionali |
| zero regressioni | **PASS** | 560 test, 0 falliti |
| zero errori JS | **PASS** | QA completa, 0 errori |

**BLOCKER #1 = CLOSED.**

Con due limiti dichiarati e non nascosti: §4(a) la vendita porta un totale e
non il conto, §4(c) la riga non ha un riferimento all'articolo. Nessuno dei due
falsifica uno storico; il secondo è il blocker #2.

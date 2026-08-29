# Il magazzino dopo il registro — cosa è cambiato, e cosa no

Fase 31. Misure prese sul file consegnato.

---

## 1. Il difetto che è sparito, misurato

| | prima | dopo |
| - | ----- | ---- |
| carico da lettore di codici a barre | scriveva `quantity`, il magazzino legge `stock`: **nessun pezzo in più** | movimento nel registro, entrambi i nomi allineati |
| scarico da lettore | il ramo non partiva mai (`quantity!==undefined` su record che hanno `stock`) | movimento `CONSUMPTION` |
| due operazioni concorrenti su 12 (+5 e −3) | **9** — una persa in silenzio | **14**, due movimenti, la lettura stantia visibile come discontinuità |
| «perché sono passato da 12 a 7» | nessuna risposta per 5 punti di scrittura su 6 | movimento, origine, quantità, documento, costo, data, risultato |
| costo di un consumo di gennaio | riletto dal listino: cambia quando cambia il listino | congelato al momento |
| scarto contro consumo | indistinguibili | due tipi separati, contati separatamente |

## 2. Cosa è stato costruito

| file | righe | cosa |
| ---- | ----- | ---- |
| `src/product/inventory-ledger.js` | 470 | il registro, puro: nessun database, nessun DOM |
| `src/product/inventory-store.js` | 200 | la persistenza: nessuna aritmetica |
| `src/product/inventory-view.js` | 230 | la vista: giacenza, movimenti e riconciliazione separati |
| `scripts/inventory.mjs` | 240 | il registro da riga di comando |
| `tests/inventory-ledger.test.mjs` | 65 test | il conto, i controlli negativi, i costi |
| `tests/qa/registro-magazzino.mjs` | 22 controlli | il registro nel prodotto vero |

## 3. I punti di scrittura, ora

| # | Modulo | Passa dal registro | Ripiego se il registro manca |
| - | ------ | ------------------ | ---------------------------- |
| 1 | `ItemsModule.adjustQty` | sì | scrive come prima; la riconciliazione lo vede |
| 2 | `Inventory.adjust` | sì | idem |
| 3 | `Componenti.use` | sì | idem |
| 4 | `Componenti.restock` | sì | idem |
| 5 | Lettore codici a barre | sì | idem, ma ora sul campo giusto |
| 6 | Gadget (catalogo) | **no** | resta scrittura diretta |

Il sesto è dichiarato, non dimenticato: lo store `gadgets` è già coperto dagli
`ARCHIVI` del registro e dalla riconciliazione — un carico manuale lì comparirà
come divergenza finché non passerà anche lui.

## 4. I criteri della Fase 31Z

| criterio | esito | prova |
| -------- | ----- | ----- |
| audit completato | **PASS** | `docs/INVENTORY-LEDGER-AUDIT.md`, 6 punti di scrittura mappati |
| `InventoryTransaction` implementato | **PASS** | schema 1, 22 campi |
| ledger append-only | **PASS** | `Object.freeze` ricorsivo; controllo negativo rosso su 4 test |
| opening balance gestito | **PASS** | idempotente, verificato nel prodotto |
| stock ricostruibile | **PASS** | 0, 1, 10, 100, 1000 movimenti |
| `previousQuantity` / `resultingQuantity` corretti | **PASS** | catena verificata movimento per movimento |
| purchase / sale / consumption / waste / return / adjustment / transfer tracciati | **PASS** | golden 100+50−20−5+3−10−2 = 116 |
| costo storico congelato | **PASS** | listino da 1,20 a 1,70: il movimento non si muove |
| `referenceId` funzionante | **PASS** | `ORDER 900123` nella spiegazione |
| audit trail funzionante | **PASS** | `spiega()`, 7 domande, 7 risposte |
| reconciliation funzionante | **PASS** | expected / actual / delta, verificata nel prodotto |
| lost update gestito | **PASS** | +5 e −3 concorrenti → 14, con la discontinuità visibile |
| migrazione dati sicura | **PASS** | store additivo, DB 30 → 31, nessun dato esistente toccato |
| test golden verdi | **PASS** | 65 unitari |
| negative tests verdi | **PASS** | 10 casi di rifiuto + il caso valido che deve passare |
| performance verificata | **PASS** | 1000 movimenti ricostruiti; vista paginata a 25 |
| UI verificata | **PASS** | 22 controlli nel browser; giacenza e movimenti due tabelle distinte |
| zero duplicazioni UI | **PASS** | `duplicati.mjs` e `duplicate-action-icons.mjs` verdi |
| zero errori JS | **PASS** | QA completa |
| zero regressioni | **PASS** | 625 test, 0 falliti |

**FASE 31 = CLOSED.**

## 5. Rischi residui, dichiarati

**(a) Il sesto punto di scrittura.** I gadget nel catalogo scrivono ancora
`g.stock` direttamente. Comparirà come divergenza nella riconciliazione, che è
il modo previsto di accorgersene.

**(b) Il consumo automatico da ordine non esiste.** Il registro è pronto —
`referenceType: 'ORDER'`, `referenceId` — ma manca il collegamento riga
d'ordine → articolo di magazzino, che è il limite già dichiarato dalla Fase 30.
Finché non esiste, i consumi vanno registrati a mano.

**(c) I quattro archivi restano quattro.** Il registro li attraversa con una
chiave `store:id` e non ne unifica nessuno. Unificarli è una migrazione di
massa, e si fa uno per volta con la riconciliazione come prova.

**(d) La concorrenza è resa innocua, non impedita.** Due movimenti simultanei
producono due movimenti e il totale giusto, ma il `previousQuantity` del
secondo può essere stantio: appare come discontinuità. Impedirlo davvero
richiederebbe una transazione IndexedDB che copra lettura e scrittura del
registro, che è possibile e non è stato fatto in questa fase.

## 6. Lo strumento

```bash
npm run inventory demo                        un registro d'esempio, spiegato
npm run inventory replay <file.json>          ricostruisce le giacenze
npm run inventory check <file.json> --stock <giacenze.json>
npm run inventory cost <file.json> <itemId>   ultimo / medio / FIFO
npm run inventory explain <file.json> <movId> «perché sono passato da 12 a 7»
npm run inventory types                       i tipi di movimento, e quelli assenti
```

`check` esce con codice 1 quando registro e giacenze non coincidono: si mette
in una pipeline e fallisce da solo.

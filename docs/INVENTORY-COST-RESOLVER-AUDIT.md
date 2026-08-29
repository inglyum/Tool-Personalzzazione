# Da dove arriva un costo, oggi

Fase 32A. Letto nel sorgente, non dedotto.

---

## 1. La sorgente unica del costo, prima di questa fase

| store | campo | significato reale | chi lo scrive |
| ----- | ----- | ----------------- | ------------- |
| `items` | `costPrice` | costo d'acquisto **dichiarato** | il modulo articoli, a mano |
| `inventory` | `costPrice` | idem | idem |
| `components` | `cost` | idem | idem |
| `gadgets` | `cost` | idem | idem |
| `catalog` | `costPrice` | costo del prodotto finito | il catalogo, a mano |
| `paints` | `costoUnitario` | costo della confezione | vernici |

**Un solo numero per articolo, digitato una volta.** È il prezzo che il
fornitore faceva quando l'articolo è stato creato, e nessun processo lo
aggiorna. Non esiste da nessuna parte un `lastCost`, un `averageCost`, un
`purchasePrice` o una traccia FIFO: la ricerca su tutto il sorgente non ne
trova nessuno.

## 2. Costo, prezzo, margine, ricarico — chi li confonde

La separazione regge quasi ovunque, con due eccezioni misurate.

| dove | cosa fa | verdetto |
| ---- | ------- | -------- |
| `mod:catalog/index.js:186, 1212, 2293` | `(salePrice − costPrice) / salePrice` | margine da costo dichiarato: **corretto**, ma il costo è quello digitato |
| `mod:catalog/index.js:817, 2294` | `costPrice / (1 − 0.45)` | prezzo da margine, con la soglia **45% scritta nel codice** — è una politica commerciale travestita da formula |
| `mod:catalog/index.js:678, 703, 941` | `{price: p.salePrice, cost: p.costPrice}` | costo e prezzo viaggiano insieme nella stessa riga: corretto, ma il consumatore deve sapere quale è quale |
| `mod:quoter` · risorse | l'option porta `dataset.cost` | è un costo, ed è quello dichiarato |

Non si sono trovati casi in cui un **prezzo di vendita** venga usato come
costo. La confusione, dove c'è, è fra *costo dichiarato* e *costo pagato* — che
è la distinzione che questa fase introduce.

## 3. Il difetto centrale: la riga non sa cosa consuma

`loadResources` costruisce l'elenco delle risorse leggendo gli store veri, e
mette l'identità dell'articolo nell'option:

```js
if(item.id) opt.dataset.itemId = item.id;      // ← l'identità c'è
```

`addLine`, poche righe dopo, la butta via:

```js
const line = {id:Date.now(), cat, catLabel, desc, detail,
              unitCost, unit, qty, subtotal, color, colorPick};   // ← non c'è
```

Una riga di preventivo era **una descrizione con un costo digitato**. Da lì in
poi nessuno poteva sapere quale materiale fosse, e infatti:

- il ricalcolo di un ordine storico (Fase 30) dichiara a schermo che un rincaro
  del materiale non entra nel confronto;
- il registro di magazzino (Fase 31) non può consumare automaticamente il
  materiale di un ordine;
- nessun costo reale può essere attribuito a un lavoro.

Il dato c'era. Mancavano due righe che lo portassero avanti.

### 3.1 Da quale archivio viene un'identità

L'`itemId` da solo non basta: `items:7` e `components:7` sono due articoli
diversi. La mappatura reale, letta branch per branch:

| categoria della riga | archivio | portava un id |
| -------------------- | -------- | ------------- |
| `materiale` | `items` (filtrato per categoria) | sì |
| `materiale` (ripiego) | `materials` | no |
| `verniciatura` | `paints` | sì, come `paintId` |
| `verniciatura` (magazzino) | `items` | sì |
| `laser` | `items` (categoria Macchinari) | sì |
| `laser` (ripiego) | `materials` | no |
| `manodopera` | `team` / valori fissi | no — e non è un articolo di magazzino |
| `gadget` | `items` | sì |
| `gadget` (ripiego) | `gadgets` | no |
| `catalogo` | `catalog` | no |

Quattro branch su dieci portavano un id, e nessuno portava l'archivio.

## 4. Chi legge un costo

| chi | come | dopo la Fase 32 |
| --- | ---- | --------------- |
| Smart Quoter (righe) | `unitCost` digitato sulla riga | resta, con accanto il costo pagato |
| `InglyCostEngine` | riceve i costi già composti dall'adapter | invariato: non legge mai un archivio |
| Smart Quoter 3D | `materialPricePerKg` dai campi del calcolatore | invariato in questa fase |
| Laser B2B | `sheetPrice` dai campi | invariato in questa fase |
| Product Builder | `PricingEngine.suggest` → motore | invariato |
| Registro di magazzino | `item.costPrice` per il saldo di apertura | corretto: è un costo dichiarato, e lo dice |

**`InglyCostEngine` non ha mai letto un archivio**, e continua a non farlo:
riceve costi e li compone. È il motivo per cui il resolver può inserirsi a
monte senza toccare una riga del motore.

## 5. Ripieghi pericolosi trovati

| dove | forma | rischio |
| ---- | ----- | ------- |
| `mod:items/index.js:865` | `+(item.quantity ?? item.qty ?? item.stock ?? 0)` | tre nomi per la stessa cosa, con ripiego a zero |
| `mod:catalog/index.js:1253` | `+p.costPrice \|\| +p.cost \|\| 0` | **un costo mancante diventa zero euro**: un margine calcolato su quello è del 100% |
| registro (Fase 31) | `unitCost: item.costPrice ?? null` | corretto: `null` significa «non lo so» |

Il secondo è la forma che questa fase vieta esplicitamente nel resolver, e che
il cricchetto ora intercetta.

## 6. Cosa deve fare la Fase 32

1. Chiudere il collegamento riga → articolo, portando avanti un dato che
   **esiste già**.
2. Un solo resolver con tre politiche, che legge **solo** il registro.
3. Mai un costo inventato: `null` e un motivo, non zero.
4. Ogni costo spiegabile fino all'acquisto che lo ha prodotto.
5. Congelare il costo risolto negli ordini, con la provenienza.

**Non** deve: toccare `InglyCostEngine`, unificare gli archivi, cambiare le
formule dei quoter, o sostituire d'autorità il costo digitato — quella è una
decisione commerciale, e la prende chi vende.

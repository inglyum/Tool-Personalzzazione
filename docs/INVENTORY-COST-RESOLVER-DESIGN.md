# InventoryCostResolver — il progetto

`src/product/inventory-cost-resolver.js` · versione **1.0.0**

Una domanda, tre modi di rispondere, un solo motore.

```
Registro  →  Resolver  →  InglyCostEngine  →  Preventivo / Ordine
(i fatti)    (il costo)   (il prezzo)         (il documento)
```

---

## 1. I quattro livelli, e perché non si mescolano

| livello | domanda | chi risponde |
| ------- | ------- | ------------ |
| fatti | quanto ho pagato, quando, a chi | `InglyInventoryLedger` |
| costo | quanto mi costa questo materiale | **`InventoryCostResolver`** |
| prezzo | a quanto lo vendo | `InglyCostEngine` |
| politica | che margine voglio, che sconto concedo | le politiche del motore |

Il resolver non conosce margini, ricarichi o sconti, e non li conoscerà mai.
`InglyCostEngine` non conosce il magazzino. Un modulo che sapesse entrambe le
cose diventerebbe il secondo motore di costo che tre fasi hanno lavorato per
eliminare — ed è quello che il cricchetto ora intercetta per nome.

## 2. Le tre politiche

| id | quando conviene | quando no |
| -- | --------------- | --------- |
| `ultimo` | prezzi volatili, riordini frequenti | un acquisto d'emergenza a prezzo alto sposta tutti i preventivi del mese |
| `media` (predefinita) | un laboratorio normale | attutisce un rincaro reale |
| `fifo` | lotti con prezzi molto diversi | richiede un registro completo per non lasciare quantità scoperte |

Non sono tre motori: sono tre risposte alla stessa domanda. `risolvi()` è
l'unica porta; `getLastCost` / `getWeightedAverageCost` / `getFifoCost` sono i
nomi della specifica e chiamano tutti lei.

## 3. FIFO risponde a due domande diverse

```js
getFifoCost(mov, chiave)                    // quanto vale quello che ho
getFifoCost(mov, chiave, { quantity: 120 }) // quanto mi costa prelevarne 120
```

Sono due numeri diversi ed entrambi giusti, e confonderli è il modo classico di
sbagliare un preventivo. Con 100 @ 1 € e 50 @ 2 €:

- il **residuo** vale 220/150 = 1,467 €/unità;
- prelevarne **120** costa 100×1 + 20×2 = **140 €**, cioè 1,167 €/unità.

La seconda è la domanda del preventivo.

## 4. La copertura non diventa mai zero

Se il registro copre solo 30 delle 100 unità richieste:

```js
{ disponibile: true, costo: 2.00, costoTotale: 60,
  richiesta: 100, coperta: 30, scoperta: 70, completa: false }
```

Il costo vale per la parte coperta. Le 70 scoperte **non** entrano a zero euro,
che diluirebbe il costo unitario a 0,60 € e produrrebbe un margine inventato.
`completa: false` è l'informazione che chi vende deve vedere.

## 5. Mai un costo inventato

Cinque motivi, che sono dati e non testo:

| motivo | significa |
| ------ | --------- |
| `NESSUN_REGISTRO` | l'articolo non ha movimenti |
| `NESSUNA_ENTRATA` | ha movimenti, ma nessuno con un costo |
| `NESSUN_ARTICOLO` | la riga non è collegata al magazzino |
| `LOTTI_SENZA_COSTO` | i lotti residui non hanno un prezzo registrato |
| `REGISTRO_ASSENTE` | il modulo del registro non è caricato |

In tutti e cinque: `costo: null`. **`null` significa «non lo so», `0`
significherebbe «è gratis»** — e un margine calcolato su zero è del 100%.

L'ordine di ripiego previsto dalla specifica si riduce quindi a: politica
richiesta → costo dal registro → *non disponibile*. Non c'è un terzo gradino
che legge il listino, perché sarebbe la cosa che questa fase esiste per
impedire, e il cricchetto lo verifica leggendo il sorgente del resolver.

## 6. La provenienza

Ogni risultato porta `lineage`: i movimenti che l'hanno prodotto, con data,
quantità, costo unitario, documento d'acquisto e fornitore.

```
€ 1,47   Media ponderata
  01/01/2026   Acquisto   100 × € 1,20   PURCHASE_ORDER ODF-14   legnami-sud
  02/01/2026   Acquisto    50 × € 2,00   PURCHASE_ORDER ODF-31   plexisicilia
```

Un numero che non si può spiegare non si può difendere davanti a un cliente.

## 7. Il collegamento riga → articolo

`itemKey` nella forma `store:id` — `items:7`, `paints:3`. La stessa chiave del
registro, perché quattro archivi vivi usano gli stessi numeri per articoli
diversi.

Il dato **esisteva già** nell'option del selettore risorse e si perdeva alla
creazione della riga. La correzione porta avanti quel dato e aggiunge
l'archivio di provenienza; le righe che non vengono da un archivio — la
manodopera, le voci scritte a mano — lasciano `itemKey: null`, che è una
dichiarazione e non una mancanza.

Da lì passa a `buildQuoteInput`, alla riga calcolata, e infine a
`itemSnapshot.itemKey` nello snapshot dell'ordine: **congelato**, come tutto il
resto della Fase 30.

## 8. Il costo congelato negli ordini

```js
costSnapshot: {
  costingPolicy, costingPolicyLabel, unitCost, costBasis, declaredCost,
  available, reason, coverage, transactionRefs, resolverVersion, resolvedAt,
}
```

`declaredCost` resta accanto a `unitCost`: fra due anni si potrà sapere non
solo quanto quel materiale era costato, ma anche quanto si credeva costasse.

## 9. Quello che il resolver non decide

Non sostituisce il costo digitato sulla riga. Lo affianca, con lo scostamento
in percentuale, e la decisione di adottarlo resta di chi vende — che può avere
ragioni che il registro non conosce (un lotto di scarsa qualità, un accordo
diverso, una scorta comprata male).

Un sistema che corregge d'autorità i numeri dell'utente viene disattivato entro
il mese.

## 10. Prestazioni, misurate

| movimenti | ultimo | media | FIFO |
| --------- | ------ | ----- | ---- |
| 100 | 0 ms | 1 ms | 1 ms |
| 1.000 | 1 ms | 3 ms | 2 ms |
| 10.000 | 14 ms | 26 ms | 16 ms |
| 100.000 | 157 ms | 283 ms | 207 ms |

Lineare, come deve essere: nessun indice, nessuna cache, nessuna ottimizzazione
prematura. A 100.000 movimenti su un articolo solo — un magazzino che nessun
laboratorio raggiungerà — la risposta arriva in un terzo di secondo.

I test tengono soglie larghe di proposito: servono a intercettare una
regressione di ordine di grandezza, non a inseguire i millisecondi. Un
cricchetto stretto su un tempo di esecuzione fallisce sul portatile di
qualcun altro e viene disattivato, che è il peggiore dei mondi.

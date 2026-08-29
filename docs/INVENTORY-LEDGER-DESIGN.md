# InventoryTransaction — il progetto

`src/product/inventory-ledger.js` (puro) · `src/product/inventory-store.js`
(persistenza) · `src/product/inventory-view.js` (vista) · schema **1**

Una regola sola, da cui discende il resto:

> **La giacenza è la somma dei movimenti. Un movimento non si modifica mai.**

---

## 1. Perché due file e non uno

`inventory-ledger.js` non conosce IndexedDB, non disegna, non legge
configurazioni. Prende movimenti, restituisce numeri.

Non è eleganza: è il motivo per cui il registro si prova con sessantacinque
test senza aprire un browser, e per cui la matematica della giacenza esiste in
un posto solo. `inventory-store.js` è la metà che parla col database e non
contiene un solo calcolo.

## 2. La transazione

```
{
  schemaVersion, id, timestamp,
  itemId, itemName, warehouseId, unit,
  type, sign, quantity, delta,
  previousQuantity, resultingQuantity,
  unitCost, totalCost, currency,
  referenceType, referenceId, operationId,
  userId, note, supplierId, customerId, batch, lot, serial,
}
```

`Object.freeze` ricorsivo alla nascita.

`previousQuantity` e `resultingQuantity` si scrivono **una volta**. Ricalcolarli
dopo significherebbe ricostruire il passato con i movimenti di oggi, che è ciò
che un registro esiste per evitare. Quando il `previousQuantity` registrato non
coincide con la quantità che il registro aveva raggiunto, `ricostruisci`
segnala una **discontinuità**: è la prova che una scrittura è avvenuta fuori
dal registro, e non si aggiusta in silenzio.

`itemId` è `store:id` — `items:7`, `inventory:3` — perché quattro archivi vivi
usano gli stessi numeri per articoli diversi.

## 3. I tipi, e quelli che mancano di proposito

| tipo | segno | |
| ---- | ----- | - |
| `OPENING_BALANCE` | + | la giacenza che esisteva prima del registro |
| `PURCHASE` | + | |
| `RETURN` | + | |
| `PRODUCTION` | + | |
| `SALE` | − | |
| `CONSUMPTION` | − | materiale **usato** |
| `WASTE` | − | materiale **perso** |
| `ADJUSTMENT` | ± | l'unico a segno libero: un errore va in due direzioni |
| `TRANSFER_OUT` / `TRANSFER_IN` | − / + | mai da soli |

**Il segno lo dichiara il tipo, non chi scrive.** Una quantità negativa su un
`CONSUMPTION` sarebbe un carico travestito da scarico, e nessun report se ne
accorgerebbe: la validazione lo rifiuta.

`RECEIPT` e `ISSUE` non esistono: sarebbero sinonimi di `PURCHASE` e
`CONSUMPTION` con un altro nome, e due nomi per la stessa cosa è il difetto che
questo progetto ha già pagato quattro volte.

`RESERVATION` e `RELEASE` non sono movimenti: una prenotazione non sposta un
grammo di materiale. Sottrarla dalla giacenza fisica farebbe dire al magazzino
che qualcosa non c'è mentre è sullo scaffale. Vivono in un piano separato —
`disponibilita()` restituisce `onHand`, `reserved`, `available`, e restano tre.

`TRANSFER` come movimento singolo non esiste: `trasferimento()` ne produce due,
legati dallo stesso `operationId`. Uno solo lascerebbe il totale giusto e i due
depositi sbagliati.

## 4. Come si corregge un errore

Non si corregge: si **rettifica**.

```
+10   PURCHASE
 −3   CONSUMPTION
 +2   ADJUSTMENT   ← «inventario fisico: contati 9, registrati 7»
```

`rettifica({attuale, contato})` costruisce il movimento che porta il registro
al valore contato e scrive perché. Un delta zero non produce nulla: un
movimento che non muove niente sporca il registro e basta.

## 5. Il costo, congelato

`unitCost` e `totalCost` sono quelli del **momento**. Nessuna delle tre letture
— ultimo costo, media ponderata, FIFO — tocca il listino corrente: leggono solo
le entrate valorizzate del registro.

È la stessa regola della Fase 30 sugli ordini, per lo stesso motivo: un costo
riletto oggi su un movimento di gennaio è un numero plausibile e falso.

Ognuna delle tre dice quando **non** può rispondere, invece di restituire zero:

```
{ disponibile: false, motivo: 'nessuna entrata valorizzata nel registro' }
```

Il FIFO conta anche le **uscite scoperte** — quantità uscite senza un'entrata
corrispondente — invece di ignorarle: succede nei primi mesi, quando il saldo
di apertura non copre tutto, e saperlo è meglio di un costo che sembra pieno.

## 6. Aggiornamenti persi

Il registro non li elimina per magia: li rende **innocui e visibili**.

Nessuno legge-per-scrivere: entrambe le operazioni *aggiungono* un movimento, e
la quantità corrente si ricostruisce dopo, da tutti e due. Il totale è giusto.
La lettura stantia resta visibile come discontinuità, che è l'informazione
utile: qualcuno ha lavorato su un numero vecchio.

| | campo | registro |
| - | ----- | -------- |
| 12, poi +5 e −3 concorrenti | **9** (uno perso) | **14** |
| traccia dell'accaduto | nessuna | due movimenti + 1 discontinuità |

## 7. La migrazione

Un `OPENING_BALANCE` per ogni articolo che oggi ha una giacenza e nessun
registro. Nient'altro.

Non si inventa una storia di acquisti che non c'è stata: si dichiara che al
giorno tale c'era quel numero, con il costo **dichiarato in anagrafica** e la
nota che dice che è dichiarato e non pagato. `referenceType: 'MIGRATION'`.

Idempotente: chi ha già la sua apertura non ne riceve una seconda. Verificato
nel prodotto.

## 8. La giacenza materializzata resta

`item.quantity` continua a esistere e a essere scritto, perché centinaia di
righe la leggono e riscriverle tutte oggi sarebbe una migrazione di massa in un
colpo solo.

Cambia **chi comanda**: la scrive il registro, dopo aver registrato il
movimento, e la riconciliazione dice quando i due non si parlano più. È il modo
di ritirare i vecchi archivi uno per volta, con la prova invece che con la
speranza.

`materializza()` allinea anche il campo alternativo (`quantity` accanto a
`stock`): finché entrambi i nomi esistono vanno tenuti d'accordo, ed è
esattamente lì che il lettore di codici a barre e il magazzino avevano smesso
di parlarsi.

## 9. Prestazioni

`ricostruisci` è lineare sui movimenti dell'articolo, non su tutto il registro:
`filtra` prima, somma poi. La vista pagina i movimenti a 25 per volta e non
ricostruisce niente per disegnare la tabella.

La giacenza materializzata **è** la cache: sta nel record, si aggiorna a ogni
movimento, e la riconciliazione è il controllo che non sia andata alla deriva.
Nessun ricalcolo all'apertura della pagina.

## 10. Cosa questo modulo non fa

- **Non è un motore di costo.** Le tre letture sono le tre domande a cui il
  registro può già rispondere onestamente. FIFO e media ponderata come
  *politica di valorizzazione* — con la scelta, gli effetti sul conto economico
  e l'integrazione con `InglyCostEngine` — sono la Fase 32.
- **Non unifica i quattro archivi.** Li attraversa, e la riconciliazione dice
  quando uno viene ancora scritto a mano.
- **Non consuma automaticamente il materiale di un ordine.** Manca il
  riferimento riga → articolo, che è il limite già dichiarato dalla Fase 30.
  Il registro è pronto (`referenceType: 'ORDER'`, `referenceId`); manca il
  collegamento a monte.

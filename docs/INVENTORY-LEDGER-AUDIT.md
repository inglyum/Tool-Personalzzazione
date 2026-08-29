# Il magazzino prima del registro

Fase 31A. Ogni riga è stata letta nel sorgente; le due misure segnate
«misurato» sono state riprodotte.

---

## 1. Chi scrive una giacenza

| # | Modulo | Funzione | File:riga | Store | Campo | Costo | Tracciato |
| - | ------ | -------- | --------- | ----- | ----- | ----- | --------- |
| 1 | Magazzino unificato | `ItemsModule.adjustQty` | `mod:items/index.js:1113` | `items` | `quantity` | no | no |
| 2 | Magazzino storico | `Inventory.adjust` | `mod:items/index.js:47` | `inventory` | `stock` | no | `logAction` |
| 3 | Catalogo componenti | `Componenti.use` | `mod:catalog/index.js:2583` | `components` | `stock` | no | no |
| 4 | Catalogo componenti | `Componenti.restock` | `mod:catalog/index.js:2592` | `components` | `stock` | no | no |
| 5 | Gadget | (catalogo) | `mod:catalog/index.js:2713` | `gadgets` | `stock` | no | no |
| 6 | Lettore codici a barre | `scan` | `mod:settings/index.js:7127` | `inventory` | **`quantity`** | no | no |

Sei punti di scrittura, quattro store, **due nomi di campo sullo stesso
store**, un solo tracciamento parziale, nessun costo registrato in nessuno.

## 2. Il difetto che nasce da due nomi — misurato

Le righe 2 e 6 scrivono lo **stesso store** `inventory` con **campi diversi**.

`DEFAULTS.inventory` (`utils/helpers.js`) crea i record con `stock`. Quindi su
un record di magazzino `quantity` **non esiste**. Nel lettore di codici a barre:

```js
if(action==='scarico' && match.quantity!==undefined){ … }   // ← non entra mai
else if(action==='carico'){ match.quantity = (match.quantity||0)+qty; }
```

- **Scarico da lettore**: la condizione è falsa, il ramo non parte, il toast di
  conferma nemmeno. La scansione risulta riuscita e non toglie niente.
- **Carico da lettore**: crea un campo `quantity` accanto a `stock`. Il
  magazzino continua a leggere `stock`, quindi **il carico non compare**.

Un magazziniere che scansiona venti pezzi in ingresso vede venti scansioni
riuscite e nessun pezzo in più.

## 3. Aggiornamenti persi — la forma, in tutti e sei i punti

Ognuna delle sei scritture ha questa struttura:

```js
const item = await IDB.get(store, id);      // ← legge
item.stock = item.stock + delta;            // ← modifica
await IDB.put(store, item);                 // ← scrive
```

C'è un `await` fra la lettura e la scrittura. Due operazioni che partono dallo
stesso 12 e scrivono 17 e 9 lasciano **9**: il primo movimento non è andato
perso per un errore di calcolo, è stato coperto, e il risultato resta
plausibile.

Non è un caso di laboratorio: un consumo da ordine e una scansione in ingresso
sullo stesso materiale bastano.

## 4. Nessun costo, quindi nessun costo storico

Nessuno dei sei punti registra il costo del movimento. La conseguenza è la
stessa che la Fase 30 ha chiuso sugli ordini: il costo di un consumo di gennaio
si rilegge oggi dal listino, quindi **cambia quando cambia il listino**.

Da questo discende che oggi non esiste, e non può esistere:

- costo medio ponderato,
- FIFO,
- valore di magazzino a una data,
- il costo reale di un lavoro.

## 5. Nessuna tracciabilità

`logAction('inventory', id, 'stock_adjusted', {delta, stock})` esiste — scrive
nello store `history` — ed è chiamato da **uno solo** dei sei punti. Registra
delta e risultato; non registra costo, documento di origine, utente, né la
quantità di partenza.

Alla domanda «perché sono passato da 12 a 7» il sistema, oggi, non ha una
risposta per cinque scritture su sei.

## 6. Cosa non esiste affatto

| | |
| - | - |
| Depositi / ubicazioni | c'è `item.location`, un campo di testo libero. Nessun trasferimento, nessuna giacenza per deposito |
| Prenotazioni | nessuna distinzione fra on hand, reserved e available |
| Scarto contro consumo | i due si sottraggono allo stesso modo: non si può sapere quanto materiale è stato **usato** e quanto **perso** |
| Riferimento a un ordine | nessuno dei sei punti scrive da quale ordine viene il consumo |
| Lotti, serie, scadenze | assenti |

L'assenza della distinzione scarto/consumo è quella che pesa di più a valle:
gli Smart Quoter chiedono un tasso di scarto all'utente perché il sistema non
sa misurarlo, pur avendone tutti i dati sotto gli occhi ogni giorno.

## 7. Duplicazioni e sovrapposizioni

- Lo store `items` è dichiarato in `idb.js` come *unified — inventory +
  components + materials + gadgets*, e `migrateToItemsStore` esiste. Ma i
  moduli storici continuano a scrivere sugli store originali: la migrazione è
  stata fatta, la sostituzione no. **Quattro archivi vivi in parallelo.**
- Tre nomi per la stessa quantità nei record: `quantity`, `qty`, `stock`. Il
  codice li legge con `item.quantity ?? item.qty ?? item.stock ?? 0`, cioè si
  difende dalla propria ambiguità a ogni lettura.

## 8. Cosa deve fare la Fase 31, e cosa no

**Deve**: rendere la giacenza *derivabile*, il costo *storico*, il movimento
*spiegabile*, e la divergenza *visibile*.

**Non deve**: unificare i quattro archivi. È una migrazione di massa, ed è la
cosa che questo progetto non fa in un colpo solo. Il registro li attraversa
tutti e quattro con una chiave `store:id`, e la riconciliazione dirà quando uno
di essi viene ancora scritto a mano — che è il modo di ritirarli uno per volta,
con la prova invece che con la speranza.

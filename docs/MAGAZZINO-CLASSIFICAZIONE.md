# Magazzino — che cosa è ogni archivio

Misurato a installazione vuota il 14 settembre 2026, con `IDB.getAll` nel
browser e una scansione dei punti di lettura e scrittura nei sorgenti.

## La classificazione

| Archivio | Record | Che cos'è | Ruolo |
| --- | ---: | --- | --- |
| `materials` | 172 | fogli, filamenti, inchiostri, vernici | **STOCK** — la giacenza vera |
| `gadgets` | 61 | supporti pronti da personalizzare | **STOCK** |
| `catalog` | 70 | i prodotti che si vendono | **PRODUCT** |
| `items` | 0 | l'archivio unificato, destinazione della migrazione | **STOCK** |
| `components` | 0 | ferramenta, magneti, viti | **COMPONENT** |
| `paints` | 0 | bombolette e vernici | **CONSUMABLE** |
| `inventory` | 4 | i quattro record del seed storico | **da consolidare** |
| `suppliers` | 0 | i fornitori | **MASTER DATA** |
| `equipment` | 0 | il parco macchine | **MASTER DATA** |
| `inventory_ledger` | — | i movimenti, append-only | **la verità sulla giacenza** |

La regola che tiene insieme il tutto: **la giacenza non è un campo, è un
saldo**. Il numero scritto sul record resta, ma non decide; lo decide la somma
dei movimenti. È il motivo per cui `inventory_ledger` è append-only e per cui
una rettifica è un movimento e non una modifica.

## available / reserved / consumed / waste

Tre su quattro esistono e sono misurati:

- **consumed** → movimento `CONSUMPTION`, valorizzato.
- **waste** → movimento `WASTE`, valorizzato e separato dal consumo — è la
  distinzione che permette di sapere quanto si butta, che sul laser e sul 3D
  non è un dettaglio.
- **available** → il saldo del registro. `InglyInventoryLedger` lo calcola dai
  movimenti, e `inventory-view` mostra il delta fra saldo atteso e giacenza
  registrata quando i due non coincidono.

**reserved non esiste, e non l'ho inventato.** Una prenotazione è materiale
impegnato da un ordine che non è ancora stato consumato: non riduce la
giacenza, riduce il disponibile. Per calcolarla servirebbe che ogni ordine
dichiari di quali materiali ha bisogno e in che quantità — un dato che oggi
nessun ordine porta in forma strutturata.

Scriverla come movimento sarebbe peggio che non averla: un movimento cambia il
saldo, una prenotazione no. Il giorno in cui gli ordini dichiareranno il
fabbisogno, `reserved` sarà una vista sugli ordini aperti, non una riga nel
registro.

## Perché non un secondo magazzino

`materials` e `items` sembrano due magazzini e sono uno solo in due tempi:
`items` è la destinazione dell'unificazione, oggi vuota perché la migrazione
riempie man mano. `gadgets` non è un doppione di `materials`: un supporto
pronto da personalizzare si compra a pezzi e si consuma a pezzi, un foglio si
compra a metri quadri e si consuma a millimetri.

`inventory` è l'unico residuo vero: quattro record scritti da
`helpers.js:DEFAULTS`, con giacenza zero. Si legge insieme agli altri dove
serve, come già fa il resolver dei costi. **Non si cancella** — potrebbe non
essere vuoto su installazioni reali.

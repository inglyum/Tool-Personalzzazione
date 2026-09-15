# Il dominio ERP/MES — chi possiede cosa

Misurato sul codice del 15 settembre 2026. Ogni riga è verificata da un test o
da una misura a runtime; dove non lo è, il documento lo dice.

## Le quattordici entità

| Entità | Owner | ID | Archivio | Source of truth |
| --- | --- | --- | --- | --- |
| CUSTOMER | `clients/index.js` | `id` | `clients` | il record |
| QUOTE | `quoter/index.js` | `id` | `quotes` | il record + `costBreakdown` |
| ORDER | `orders` + patch 052 | `id` | `orders` | il record; economia da `economicSnapshot` se congelato |
| PRODUCTION JOB | — | — | — | **non è un'entità**: è l'ordine con un routing |
| OPERATION | `InglyOperazioni` | `id` dentro `order.production.operations[]` | dentro `orders` | l'array sull'ordine |
| MACHINE | `InglyMachineCost` | `id` | `equipment` | il record |
| MATERIAL | `InglyInventoryStore` | `itemKey` = `store:id` | `materials`, `items`, `gadgets` | il record per l'anagrafica |
| MATERIAL REQUIREMENT | `InglyFabbisogno` | derivato da `itemKey` | **nessuno** | calcolato dalla distinta |
| LABOR | `InglyCostEngine` (profili) | `key:'main'` | `labor_profiles` | il profilo |
| ACTUAL COST | `InglyConsuntivo` + `InglyCostBreakdown` | `modulo:id` | `localStorage` + `cost_entries` | il consuntivo |
| SALE | `InglyOrderSales` | `id` | `sales` | il record |
| PAYMENT | `InglyPagamenti` | — | dentro `sales` | `status` + `deposit` + `paymentHistory` |
| INVENTORY | `InglyInventoryLedger` | `itemKey` | `inventory_ledger` | **il registro**, non il campo giacenza |
| AUDIT | `logAction` / `snapshotRecord` | `id` | `history`, `versions` | append-only |

Tre di queste **non hanno un archivio proprio, e non devono averlo**:

- **PRODUCTION JOB** — un ordine in produzione è l'ordine, con `production.operations[]`.
  Dargli una tabella vorrebbe dire due copie che divergono al primo salvataggio.
- **MATERIAL REQUIREMENT** — è un calcolo sulla distinta, non un dato. Memorizzarlo
  lo farebbe invecchiare rispetto al preventivo da cui nasce.
- **PAYMENT** — vive sulla vendita. Uno stato di pagamento in una tabella a parte
  è il modo classico di avere due verità su chi ha pagato.

## Duplicazioni reali trovate

Nessuna nel dominio. Le tre che c'erano sono chiuse:

- cinque percorsi ordine→vendita → **uno**: `InglyOrderSales`;
- tre «segna pagato» → **uno**: `InglyPagamenti.registra`;
- due contratti da `validateInput` → **uno**.

Resta **una divergenza non risolvibile senza riscrivere lo storico**: due
vocabolari di stato ordine, `working` nel motore di workflow e `produzione`
nell'elenco. Vedi sotto.

## Mappa degli stati

### Operazione (MES) — sette stati

    da_fare → in_coda → in_produzione → controllo_qualita → completata
                 ↑          ↓    ↑                 ↓
                 └──────  pausa  └──── rifacimento ┘
    (qualunque) → annullata → da_fare

Le transizioni sono dichiarate in `InglyOperazioni.TRANSIZIONI` e un salto
impossibile viene **rifiutato con il motivo e le alternative**. Due passaggi
all'indietro sono leciti perché succedono davvero: il pezzo che torna in
lavorazione dal controllo, e il rifacimento di un'operazione completata.
Nessuno stato torna a «da fare» tranne «annullata» — tornarci da metà
lavorazione cancellerebbe il fatto che quella lavorazione è avvenuta.

### Traduzione dello storico

`InglyOperazioni.statoDi()` traduce **tredici** nomi storici. Lo storico non si
riscrive: si legge. Uno stato ignoto diventa `da_fare`, cioè lo stato più
innocuo, invece di sparire.

### Ordine — due vocabolari, dichiarati

| | vocabolario | dove |
| --- | --- | --- |
| motore di workflow | `backlog, working, ready, delivered, sold, invoiced, paused` | `WorkflowSync.ORDER_STATES` |
| elenco ordini | `backlog, lead, preventivo, confermato, produzione, spedizione, consegnato, venduto, annullato` | patch 052 |

Convivono su dati storici diversi. Unificarli richiederebbe di riscrivere
ordini vecchi, che il mandato vieta. Il routing risponde a entrambi, e uno
stato che il motore non conosce viene **rifiutato**, non ingoiato.

## I flussi

### Materiale

    Smart Quoter (riga con itemKey)
      → costBreakdown.voci[].itemKey          conservato (non lo era)
      → order.costBreakdown                   clonato da quote-to-order
      → economicSnapshot.items[].itemKey      congelato
      → InglyFabbisogno.daOrdine()            required
      → InglyFabbisogno.impegnato()           committed — NON tocca il saldo
      → movimento CONSUMPTION                 consumed — saldo giù
      → movimento WASTE                       waste, separato
      → InglyInventoryLedger.ricostruisci()   giacenza

`disponibile = giacenza − impegnato`. Sotto zero è uno **scoperto**, dichiarato.
Una riga senza `itemKey` non genera fabbisogno: finisce fra le `nonCollegate`
col motivo. Nessuno stock fittizio, nessun materiale inventato.

### Macchina

    equipment → InglyMachineCost.normalizza()  identità + economia
              → operation.machineId            il collegamento
              → order.production.operations[]  il lavoro
              → InglyRedditivitaMacchina.per() euro/ora

Parco vuoto → `parcoVuoto: true`, non un elenco di zeri.

### Economia

    preventivo → distinta (11 categorie, 14 driver)
               → economicSnapshot congelato
               → consuntivo (driver reali)
               → InglyCostBreakdown.consuntivoEconomico()

**Regola assoluta, verificata:** il consuntivo cambia `actualCost`, mai
`revenueNet`. Un driver non rilevato non vale zero: si integra col preventivo e
il risultato si dichiara `completo: false`.

### Pagamento

    sale.status + deposit + dueDate
      → InglyPagamenti.stato()
      → non_pagato | parziale | pagato | scaduto | rimborsato | annullato

`parziale` e `scaduto` sono **derivati**, non memorizzati: uno stato scritto in
archivio diventa falso da solo col passare dei giorni.

## Repository readiness

I dodici moduli di dominio si caricano ed eseguono in un contesto **senza
`IDB`, senza `localStorage`, senza `document`** — verificato da
`tests/dominio-senza-storage.test.mjs`, che si spegne se qualcuno ci infila
dentro una chiamata allo storage.

Le chiamate dirette a `IDB` che restano in `src/product/` stanno in funzioni
di **interazione** — `chiediRicalcolo` apre una modale e chiama `toast` — non
nelle funzioni di dominio. Spostarle sarebbe un refactor estetico e il mandato
lo vieta; il confine, misurato, regge.

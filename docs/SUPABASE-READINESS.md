# Da IndexedDB a Supabase — la mappa, non la migrazione

**Questo documento non implementa niente.** Nessuna migration, nessuna
connessione, nessun database toccato. È la mappa che serve il giorno in cui
qualcuno deciderà di farlo, scritta ora che il dominio è fresco.

    dominio → InglyRepository → IDB          oggi
    dominio → InglyRepository → Supabase     domani, senza toccare il dominio

Il ponte esiste già ed è provato: `tests/repositories.test.mjs` monta un
motore che non è IndexedDB e rilegge gli stessi dati con lo stesso codice.

## Le tabelle candidate

`tenant_id` sta su tutte. Non c'è oggi — l'applicazione è mono-utente — ma
aggiungerlo dopo, su dati esistenti, costa molto più che prevederlo adesso.

| Entità | Tabella | PK | FK | Audit | RLS |
| --- | --- | --- | --- | --- | --- |
| CUSTOMER | `clients` | `id` | — | sì | `tenant_id` |
| QUOTE | `quotes` | `id` | `client_id` | sì | `tenant_id` |
| ORDER | `orders` | `id` | `client_id`, `quote_id` | sì | `tenant_id` |
| OPERATION | `order_operations` | `id` | `order_id`, `machine_id`, `operator_id` | sì | via `order_id` |
| MACHINE | `machines` | `id` | — | sì | `tenant_id` |
| MATERIAL | `items` | `id` | `supplier_id` | sì | `tenant_id` |
| INVENTORY | `inventory_ledger` | `id` | `item_id`, `order_id` | **append-only** | via `item_id` |
| SALE | `sales` | `id` | `order_id`, `client_id` | sì | `tenant_id` |
| PAYMENT | `sale_payments` | `id` | `sale_id` | sì | via `sale_id` |
| COST PROFILE | `cost_profiles` | `key` | — | sì | `tenant_id` |
| ACTUAL COST | `cost_entries` | `id` | `order_id`, `operation_id` | sì | via `order_id` |
| AUDIT | `audit_log` | `id` | polimorfico | — | `tenant_id`, sola lettura |
| VERSION | `record_versions` | `id` | polimorfico | — | `tenant_id`, sola lettura |

## Le tre decisioni che cambiano la forma

**1 · `order.production.operations[]` diventa una tabella.**
Oggi le operazioni sono un array dentro l'ordine, perché IndexedDB non fa join
e tenerle insieme evitava due letture. In SQL diventano righe con
`order_id`: è l'unico modo per chiedere «tutte le operazioni in coda sulla
xTool» senza leggere tutti gli ordini. `InglyOperazioni.leggi(ordine)` è già
l'unico punto che le estrae — cambia lui, non chi lo chiama.

**2 · `paymentHistory[]` diventa `sale_payments`.**
Stessa ragione, stesso confine: `InglyPagamenti.stato()` è l'unico lettore.

**3 · Il consuntivo lascia `localStorage`.**
`InglyConsuntivo` scrive su `localStorage` con chiavi `modulo:id`. È l'unico
pezzo di dominio che non passa da IDB, ed è anche il più fragile — una
scrittura fallita lì è un consuntivo perso. In Supabase diventa `cost_entries`
con `order_id`. **È il primo pezzo da migrare**, non l'ultimo.

## Quello che NON deve diventare una tabella

- **PRODUCTION JOB** — è l'ordine con un routing. Una tabella a parte
  significherebbe due stati dello stesso lavoro.
- **MATERIAL REQUIREMENT** — è un calcolo sulla distinta. Memorizzarlo
  lo farebbe invecchiare rispetto al preventivo da cui nasce.
- **RESERVED** — è la somma dei fabbisogni degli ordini aperti. Scriverlo
  vorrebbe dire mantenerlo, e un numero mantenuto a mano diverge.

## Append-only e RLS

`inventory_ledger`, `audit_log` e `record_versions` non devono ammettere
`UPDATE` né `DELETE`: sono registri, e un registro modificabile non è un
registro. In Supabase è una policy, non una convenzione — che è meglio di
oggi, dove è solo una convenzione rispettata dal codice.

## Ordine consigliato, se un giorno si farà

1. `cost_entries` (oggi su `localStorage`, il pezzo più fragile)
2. `clients`, `items`, `machines` — anagrafiche, poche righe, poche relazioni
3. `quotes`, `orders` + `order_operations`
4. `sales` + `sale_payments`
5. `inventory_ledger` — per ultimo, perché è il più grande e il più delicato

Nessuno di questi passi richiede di toccare un modulo di dominio.

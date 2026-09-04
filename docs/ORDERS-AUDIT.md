# ORDERS — mappa delle dipendenze

Censimento §1. **Nessun file è stato modificato per produrre questo documento.**
Ogni numero è misurato con `grep` sul sorgente, non stimato.

---

## 1. Store che contengono ordini

Sono **tre**, non uno. Due sono in IndexedDB, il terzo in `localStorage`.

| # | Store | Dove | Record | Chi scrive | Stato |
|---|-------|------|--------|-----------|-------|
| 1 | `orders` | IndexedDB | ordine canonico | `GestioneOrdini`, `OrderFlow`, `updateOrderStatus` | **canonico** |
| 2 | `pipeline` | IndexedDB | copia di `orders` | 17 punti in 7 file | mirror scritto |
| 3 | `ingly_orders_pro_v1` | localStorage | ordine indipendente | 4 punti in 4 patch | **sconosciuto a `orders`** |

### 1.1 `orders` — il canonico

Deciso nella Fase 3 (commit `ee9ab6e`). `GestioneOrdini.getOrders()` legge
esclusivamente da qui, e `GestioneOrdini.STATES` è l'unica tabella di stati con
il commento «UNICA fonte di verità». La normalizzazione `_normalizeState()`
traduce gli stati legacy in ingresso invece di aggiungerne di nuovi.

### 1.2 `pipeline` — un mirror ancora scritto

La Fase 3 ha tolto la voce «Pipeline» dal menu e ha scritto la migrazione
`src/core/migrations/pipeline-to-orders.js`. Ha però lasciato in piedi la
**doppia scrittura**: ogni volta che un ordine cambia, il codice aggiorna
`orders` e poi cerca la riga gemella in `pipeline` e aggiorna anche quella.

    src/legacy/app/src/modules/orders/index.js      65 riferimenti
    src/legacy/app/src/modules/pipeline/index.js    15
    src/legacy/app/src/modules/quoter/index.js       8
    src/legacy/app/src/modules/sales/index.js        4
    src/legacy/patches/042|046|055                   21 complessivi

`window.updateOrderStatus` (`idb.js:342`) — la funzione dichiarata SSOT — ha già
smesso: al punto 4 c'è il commento «SSOT: only 'orders' store».

**Correzione a una prima lettura di questo censimento.** Quei 17 punti sembrano
doppie scritture, e non lo sono: patch 046 intercetta `IDB.put('pipeline')` e lo
dirotta su `orders`, mentre `getAll('pipeline')` proietta da `orders`. La
pipeline era già una vista al livello di IndexedDB. Restano però due buchi
reali, descritti al §7.

**Lettura preferenziale.** `PipelineOS.render()` (`pipeline/index.js:56-58`):

```js
const usePipeline = pipelineRaw && pipelineRaw.length > 0;
const orders = usePipeline ? pipelineRaw : ordersRaw;
```

Finché `pipeline` contiene anche un solo record, quella vista **ignora
`orders`**. Non è un fallback: è una seconda sorgente di verità che vince.

### 1.3 `ingly_orders_pro_v1` — il terzo store, in localStorage

`OrderTracker` (patch 083, `var SK='ingly_orders_pro_v1'`) ha stati propri —
`draft/confirmed/in_progress/delivered/paid/cancelled` — che non sono quelli di
`GestioneOrdini.STATES`, e non passano da `_normalizeState()`.

Vi si creano ordini per due strade:

| Origine | File | Effetto |
|---------|------|---------|
| Import CSV/Etsy | `084:556` | ordini importati invisibili a `orders` |
| Preventivo Laser B2B → ordine | `094:265` | `quoteId` collegato, `orderId` mai in `orders` |

Un ordine nato da un preventivo Laser B2B **non compare in Ordini.**
È la violazione più grave di ONE ORDER = ONE RECORD, e non riguarda `pipeline`.

---

## 2. Store di supporto

| Store | Contenuto | Proprietario | Giudizio |
|-------|-----------|--------------|----------|
| `workflow_steps` | fasi personalizzabili | `OrderFlow.stages()` / `_addStage` / `_updateStage*` | configurazione, corretto |
| `order_events` | timeline per ordine | `idb.js:388`, `orders/index.js`, patch 042 | timeline unica, corretto |

Nessuno dei due contiene copie dell'ordine: contengono configurazione ed eventi.
§8 e §9 sono già soddisfatti nella sostanza.

---

## 3. Renderer che disegnano ordini

**Otto** oggetti distinti, in cinque file.

| Oggetto | File | Legge | Raggiungibile da |
|---------|------|-------|------------------|
| `GestioneOrdini` | patch 052 | `orders` | `gestione_ordini` ← hub |
| `OrderFlow` | orders/index.js:1405 | `orders` + `pipeline` | drawer, PDF, kanban |
| `Orders` | orders/index.js:320 | `orders` | fallback se GestioneOrdini assente |
| `Workflow` | orders/index.js:4 | `quotes` | — |
| `Produzione` | orders/index.js:906 | `orders` | — |
| `Pipeline` | orders/index.js:1044 | `quotes`→`orders` | logica quote→order, non renderer |
| `PipelineOS` | pipeline/index.js:8 | **`pipeline`** | `pipeline` (redirect) |
| `WorkflowDashboard` | patch 042:225 | `orders` | `workflow_dashboard` |
| `OrderTracker` | patch 083:146 | **`ingly_orders_pro_v1`** | `order_tracker` |

`App._redirectMap` (`app.js:212`) già convoglia `pipeline`, `crm_pipeline`,
`orders`, `workflow`, `produzione` su `gestione_ordini`. Restano fuori dal
redirect — e quindi ancora sezioni autonome — `workflow_dashboard`, `kanban`,
`order_tracker`.

---

## 4. Voci di navigazione

`src/app-shell/nav-map.js`, gruppo Produzione:

    workflow_dashboard   «Pianificazione lavori»   ← §11: deve essere assorbita
    kanban               «Kanban»                  ← §3: è una vista, non una sezione
    order_tracker        «Avanzamento ordini»      ← §11: legge il terzo store

`Pipeline` non è più nel menu: la Fase 3 l'ha già tolta. §10 è soddisfatto per
la navigazione, **non** per i dati.

---

## 5. La barra «Viste» che porta via invece di cambiare vista

Patch 161 inietta dentro `gestione_ordini` una barra con quattro bottoni —
Kanban, Panoramica, Tracker, Scadenzario — che chiamano `App.navigate(sezione)`.
Sono **uscite dalla sezione**, non selettori di vista. §3 chiede il contrario:
le viste devono essere dello stesso dataset, dentro la stessa sezione.

`GestioneOrdini` ha già quattro viste vere (`_setView`): kanban, produzione,
lista, calendario — tutte su `getOrders()`. Mancano **Timeline** e **Analytics**.

---

## 6. Difetto trovato verificando: `updateOrderStatus` perde argomenti e risultato

Patch 092 (riga 172) riavvolge la funzione SSOT:

```js
var _origUpdate = window.updateOrderStatus;
window.updateOrderStatus = function(id, status){
  _origUpdate(id, status);
  ...
};
```

Tre conseguenze, tutte silenziose:

1. **`opts` sparisce.** L'originale accetta `(orderId, newStatus, opts)` e usa
   `opts.note` per lo storico e `opts.skipSale` per non creare due vendite. Il
   wrapper ha due parametri: la nota non viene mai scritta, e `skipSale` non
   arriva mai — la vendita automatica scatta anche quando il chiamante aveva
   chiesto di non crearla.
2. **Il risultato sparisce.** Nessun `return`. `GestioneOrdini.transition()` fa
   `const result = await window.updateOrderStatus(...)` e riceve `undefined`:
   `QuickStats.update()` e `SidebarBadges.update()` non vengono **mai** eseguiti
   dopo un cambio di stato.
3. **Nessun `await`.** L'originale è `async`; il wrapper non lo attende, quindi
   il codice che segue gira prima che l'ordine sia salvato.

Il wrapper serviva a registrare la prima nota al pagamento — legge però
`ingly_orders_pro_v1`, il terzo store, non `orders`. La funzione utile va
mantenuta; il modo di agganciarla no.

---

## 7. Cosa resta da fare, in ordine di gravità

| # | Difetto | §  |
|---|---------|-----|
| 1 | `ingly_orders_pro_v1`: terzo store, ordini invisibili a Ordini | 2, 13, 24 |
| 2 | `updateOrderStatus` avvolto perde `opts`, risultato e `await` | 2 |
| 3 | L'intercettore pipeline→orders, se l'ordine non esiste, scrive nello store legacy che nessuna lettura restituisce | 2, 21 |
| 3b | Il quoter specchia i preventivi nella pipeline con l'id del preventivo: record perso, o fuso in un ordine estraneo | 2 |
| 4 | `PipelineOS` preferisce `pipeline` a `orders` in lettura | 2 |
| 5 | `workflow_dashboard`, `kanban`, `order_tracker` sezioni autonome | 3, 10, 11 |
| 6 | Barra «Viste» che naviga invece di cambiare vista | 3 |
| 7 | Mancano le viste Timeline e Analytics | 3, 8 |

Nulla è stato eliminato. Il §22 impone l'ordine: identificare i consumatori,
migrare, reindirizzare le letture, poi le scritture, testare, e solo dopo
eventualmente deprecare.

# CRM Clienti — che cosa c'è oggi

Misurato sul file consegnato, non dedotto dal codice. La riproduzione del
difetto principale è in `tests/qa/crm-paginazione.mjs` — rossa oggi, di
proposito.

---

## 1. Quattro liste clienti, due memorie diverse

È il difetto ricorrente di questo progetto: due sistemi che possiedono lo
stesso concetto, ognuno corretto per conto suo e sbagliato in coppia. Qui sono
quattro.

| Vista | Modulo | Memoria | Paginazione |
| ----- | ------ | ------- | ----------- |
| **`view-clienti`** — quella che l'utente apre | `CRMSmart`, patch 076 + 081 | `localStorage['ingly_crm_v1']` | aggiunta dalla patch 092, e non funziona (§2) |
| `Clients.render()` | `mod:clients/index.js:325` | IndexedDB `clients` | `_page` / `_pageSize` 50 |
| `LeadScorer` | `mod:clients/index.js:1164` | IndexedDB `clients` | `_page` / `_pageSize` 25 |
| `ClientIntelligence` | `mod:clients/index.js:1424` | `BDW.segments` (derivato da `sales`) | `_ciPage` / `_ciPageSize` 20 |

Misurato a runtime: `Clients.render()` scrive dentro `#clients-list`, e
**`#clients-list` non esiste nel documento**. `view-clienti` appartiene a
`CRMSmart`, che disegna `#crm-table` / `#crm-tbody`.

Conseguenza concreta, verificata: scrivendo 137 clienti nell'archivio `clients`
di IndexedDB, la vista Clienti continua a mostrare «0 clienti». La lista
paginata, ordinabile e filtrabile che il codice implementa non è la lista che
l'utente vede.

## 2. CRM-02 · «pagina successiva» mostra gli stessi clienti — causa trovata

**Non è un problema grafico.** `src/legacy/patches/092-…js:197-227` sostituisce
`CRMSmart.render` per le liste sopra i 50 elementi:

```js
var slice = filtered.slice(page*pageSize, (page+1)*pageSize);   // ← calcolata
_origRender.call(this);                                          // ← e ignorata
setTimeout(function(){ …aggiunge la barra dei numeri di pagina… }, 200);
```

`slice` è una variabile morta. `_origRender` ridisegna la tabella da
`this._load()`, cioè **l'elenco intero**. La barra che viene appesa dopo cambia
il numero di pagina e nient'altro.

Riprodotto con 137 clienti (`tests/qa/crm-paginazione.mjs`):

```
  prima del click : 137 righe · Cliente 001, 002, 003 · «1 / 5 pagine · 137 clienti»
  dopo il click   : 137 righe · Cliente 001, 002, 003 · «2 / 5 pagine · 137 clienti»
```

L'etichetta si muove, la tabella no. Con 137 righe disegnate a ogni click, il
difetto è anche la ragione per cui la vista rallenta: la paginazione era stata
scritta per non disegnarle tutte, e le disegna tutte lo stesso.

La correzione deve togliere l'origine, non nascondere il sintomo: una sola
funzione che costruisce le righe **dalla pagina**, non due che si sovrascrivono.

## 3. Altri rilievi misurati

- **Nessuna paginazione nel percorso base.** `CRMSmart._buildHTML` (patch 081)
  fa `data.map(...)` su tutto l'elenco: sotto i 50 clienti non c'è paginazione
  affatto, sopra i 50 c'è quella rotta di §2.
- **Ricerca senza indice.** `filterClients` filtra in memoria su
  `name/phone/email/company/tags` a ogni battuta, con un debounce di 200 ms
  aggiunto dalla patch 092 sopra una funzione che ridisegna tutto.
- **Le righe si identificano per indice.** `CRMSmart._editClient(i)` e
  `_deleteClient(i)` ricevono la **posizione** nell'array, non un id. Dopo un
  ordinamento, un filtro o una paginazione che funzioni, l'indice punta a un
  altro cliente. È un difetto latente che la correzione di §2 renderebbe
  attivo: va chiuso nello stesso lavoro.
- **Nessun id stabile.** I record scritti da `CRMSmart` non hanno `id`: sono
  identificati dalla posizione. Serve una migrazione che ne assegni uno senza
  perdere nulla.
- **Eliminazione senza vincoli.** Non c'è alcun controllo su ordini, preventivi,
  fatture o pagamenti collegati prima di cancellare un cliente.

## 4. Che cosa NON va fatto

- Non «risolvere» §2 nascondendo le righe in eccesso con CSS: la tabella
  continuerebbe a costruirle, e il rallentamento resterebbe.
- Non creare una quinta lista clienti. Il lavoro è di **consolidamento**: una
  sorgente, una funzione che disegna, una paginazione.
- Non cambiare la chiave `ingly_crm_v1` senza migrazione: è dove stanno i
  clienti veri di chi usa il prodotto oggi.

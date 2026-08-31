# CRM-05 — una funzione sola disegna la riga cliente

## Il censimento, misurato sul file consegnato

La roadmap diceva quattro. Contandoli sul file sono **otto**.

| # | Dove | Che cosa fa | Arriva a schermo? |
| - | ---- | ----------- | ----------------- |
| 1 | `patches/081` `CRMSmart._buildHTML` | costruisce la riga intera di `view-clienti` | **sì** — è l'unico |
| 2 | `patches/082` `CRMSmart.render` | riappende i chip dei tag nella cella del nome, 200 ms dopo | no |
| 3 | `patches/082` `CRMSmart._buildHTML` | chiama l'originale e ne restituisce il risultato **intatto** | inerte, ma è un secondo proprietario del markup |
| 4 | `patches/085` `CommHistory._addBtn` | aggiunge il pulsante «storico comunicazioni», 400 ms dopo | no |
| 5 | `patches/089` `_injectNoteBtn` | aggiunge «note interne», 500 ms dopo | no |
| 6 | `patches/089` `_injectArchivioBtn` | aggiunge «archivio preventivi», 600 ms dopo | no |
| 7 | `patches/092` `_injectProfileBtn` | aggiunge «profilo cliente», 400 ms dopo | no |
| 8 | `patches/018` CRM Pro | una seconda tabella, e la disegna **due volte** (`renderCRMPro` e `_proxCRMFilter`) | sì, su un'altra lista |
| 9 | `mod:clients` `Clients.render()` | la tabella completa con punteggio e storico | no — scrive in `#clients-tbody`, che non esiste |

## Perché cinque di loro non arrivavano

Cercavano la riga per **posizione**:

```js
var row = document.getElementById('crm-row-' + i);   // i = indice nell'array
```

CRM-04 ha dato alle righe l'id del cliente (`crm-row-<id>`). Da quel momento il
selettore non ha più trovato niente. I chip dei tag e quattro pulsanti hanno
smesso di comparire — **senza un errore in console**, perché `if(!row) return;`
è esattamente la riga che rende invisibile un difetto.

Due di quei quattro non partivano nemmeno:

```js
if (typeof CRMSmart === 'undefined' || !CRMSmart._v31qbtn) { setTimeout(_p, 700); return; }
```

`_v31qbtn` **non viene impostato da nessuna parte** in tutto il file. Il polling
ogni 700 ms non è mai terminato, e i due pulsanti non sono mai stati installati.

## La correzione

`src/product/cliente-riga.js`, e tre regole verificate dai test:

1. **Non recupera dati.** Non conosce `localStorage`, non conosce `IDB`, non
   chiama `_load()`: riceve la pagina già scelta. Il test lo esegue in un
   contesto dove quelle cose non esistono, e controlla che il sorgente non le
   nomini.
2. **Non crea id.** Una scheda senza identificativo lo dichiara e resta **senza
   comandi**: un pulsante «elimina» che agisce su una posizione nell'array è il
   difetto che CRM-04 ha appena chiuso.
3. **Tutto passa da `esc()`.** «Rossi & Figli» rompeva la cella; un `<` faceva
   di peggio. Nessuna delle otto copie lo faceva sul nome.

Chi vuole aggiungere un comando alla riga si registra:

```js
InglyClienteRiga.aggiungiAzione({
  id: 'archivio-preventivi',
  prepara: function () { /* una volta per tabella, non una per riga */ },
  quando: function (c, ctx) { … }, icona: …, comando: …,
});
```

`prepara()` viene chiamato **una volta per tabella**. Prima, il pulsante
«archivio» rileggeva e ri-parsava tutti i preventivi da `localStorage` una volta
per ogni riga.

## Collaudi

- `tests/cliente-riga.test.mjs` — 18 controlli sulle tre regole
- `tests/qa/crm-riga-unica.mjs` — 25 controlli sulla pagina vera: i tag ci sono,
  i quattro pulsanti sono tornati, nessuno riscrive la riga dopo il disegno,
  l'id sopravvive al riordino

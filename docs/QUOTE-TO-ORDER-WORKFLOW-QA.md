# PREVENTIVO → ORDINE — che cosa era rotto e com'è adesso

Route: Smart Quoter → «Invia a Workflow» → Ordini & Workflow.
Documento breve: i difetti, la causa, la correzione, la prova.

---

## BUG 1 · Cinque implementazioni dello stesso metodo, e vinceva la peggiore

**Causa.** `Quoter.sendToWorkflow` esisteva in cinque copie:

| Dove | Quando | Che cosa faceva |
| ---- | ------ | --------------- |
| `modules/quoter/index.js` | al caricamento | l'originale |
| `modules/orders/index.js` | al caricamento | **sostituiva** |
| `patches/085` | a 1200 ms | avvolgeva |
| `patches/051` | a 2000 ms | **sostituiva** |
| `patches/066` | a 1500 ms | adattatore su `_saveOrderFromQuoter` (legittimo) |

Misurato nel browser leggendo `String(Quoter.sendToWorkflow)`: vinceva la
patch 051, l'ultima ad arrivare. Le altre quattro erano codice morto — compreso
l'unico controllo sull'idempotenza, che stava in `modules/orders`.

**Correzione.** Una sola implementazione, nel preventivatore, che delega a
`InglyQuoteToOrder`. Le altre tre sono rimosse. Chi deve aggiungere campi
all'ordine registra un decoratore: `InglyQuoteToOrder.aggiungiDecoratore(fn)`.

## BUG 2 · L'errore di salvataggio veniva inghiottito

```js
await this.saveQuote().catch(()=>{});
```

**Causa.** `saveQuote()` restituiva `undefined` sia quando riusciva sia quando
si fermava per un campo mancante, quindi non c'era niente da controllare. Un
preventivo non salvato produceva comunque un ordine.

**Correzione.** `saveQuote()` restituisce `{ok, id, quote}` o
`{ok:false, motivo}`. La pipeline si ferma al passo `salva` e non chiama il
workflow. **Prova:** FASE E — senza titolo, zero ordini creati.

## BUG 3 · Successo dichiarato senza verifica

**Causa.** `_saveOrderFromQuoter` mostrava «✅ Ordine creato» subito dopo
`IDB.put`. Un `put` che non solleva non dimostra che il record sia leggibile:
la quota può essere esaurita, la serializzazione può perdere un campo.

**Correzione.** Dopo ogni scrittura si **rilegge**, e si controllano i campi
che servono (`CAMPI_QUOTE`, `CAMPI_ORDINE`). Il messaggio arriva dopo.
**Prova:** i test unitari `putSparisce` e `salvaNonVerificabile`.

## BUG 4 · Un totale calcolato da una formula parallela

**Causa.** La patch 051 faceva `subtotal × (1 + markup)`: l'ordine non
corrispondeva al preventivo mostrato al cliente.

**Correzione.** Il totale viene dal preventivo **verificato**
(`quote.netPrice`), mai ricalcolato. **Prova:** FASE B6.

## BUG 5 · L'ordine non sapeva di chi era

**Causa.** Passava solo `clientName`. Due clienti omonimi diventavano lo stesso
cliente; uno rinominato spariva dal suo ordine.

**Correzione.** `clientId` viaggia con l'ordine. Il nome resta, come etichetta.
**Prova:** FASE A3, B5, G3.

## BUG 6 · Due clic, due ordini

**Correzione.** Tre difese, perché proteggono da tre cose diverse:

1. il pulsante si disabilita durante l'invio — ferma il secondo clic;
2. `_invioInCorso` fa sì che una seconda chiamata **aspetti la prima** invece
   di partire in parallelo — copre l'invio da tastiera e le due schede;
3. l'idempotenza su `quoteId` dentro la pipeline — ferma il secondo ordine
   quando le prime due non bastano.

Dopo un invio riuscito il preventivatore tiene l'id del preventivo salvato:
ripremere aggiorna quello invece di crearne un secondo identico.
**Prova:** FASE C, C2, C3, C4 e i test `due invii`, `quoteId come stringa`.

## BUG 7 · Due totali sulla stessa schermata

**Causa.** Sette chiamate su otto passavano `{setupCost: 0}` e una no. I sei
campi dei costi extra — imballo, spedizione, verniciatura, lavorazione,
personalizzato, altro — entravano quindi **solo** nel riepilogo a destra.
Misurato: **€ 30 a schermo, € 20 salvati**, su un preventivo da una riga.
Quel che finiva nel PDF, in WhatsApp e nell'ordine era il totale senza gli
extra che l'utente aveva appena scritto.

**Correzione.** Uno stato solo. Restano due eccezioni dichiarate: il PDF che
stampa una selezione di righe, e l'anteprima di un modello.
**Prova:** FASE H → H5 — schermo, motore, preventivo salvato e ordine allo
stesso numero.

---

## La pipeline

```
valida → salva → verifica → idempotenza → prepara → crea → verifica → collega → apri
```

Ogni passo può fallire, e ogni fallimento lascia il sistema in uno stato
descrivibile a parole:

| Scenario | Risultato |
| -------- | --------- |
| preventivo non valido | niente scritto, niente ordine |
| salvataggio fallito | nessun ordine, motivo specifico |
| preventivo non rileggibile | nessun ordine |
| ordine già esistente | nessun secondo ordine, si offre di aprire quello |
| ordine fallito | **il preventivo resta salvato**, e lo si dice |
| ordine non rileggibile | non si dichiara completato, nessun evento |
| legame non scritto | l'ordine resta valido, si registra l'errore |

Non c'è una transazione a due fasi perché IndexedDB non ne offre una fra store
diversi. C'è un ordine dei passi tale che ogni fallimento è descrivibile, e
nessun fallimento produce un successo dichiarato.

L'evento `orderUpdated` parte **dopo** la verifica: emetterlo prima significa
mostrare in lista una riga che al ricaricamento non c'è più.

---

## Esito

| Area | Esito |
| ---- | ----- |
| QUOTE SAVE | PASS — esito strutturato, scrittura verificata rileggendo |
| ORDER CREATE | PASS — esito strutturato, scrittura verificata rileggendo |
| LINK quote ↔ order | PASS — nei due versi, regge al ricaricamento |
| CLIENT | PASS — `clientId` sull'ordine, non solo il nome |
| WORKFLOW | PASS — l'ordine compare senza ricaricare |
| DOPPIO INVIO | PASS — tre difese, un ordine solo |
| TOTALI | PASS — schermo = preventivo = ordine |
| FALLIMENTO ATOMICO | PASS — nessun successo dichiarato senza verifica |
| STORAGE | PASS — tutto rileggibile dopo reload |
| PRODUZIONE | NON VERIFICATO in questo giro — l'ordine porta stato e scadenza, ma il passaggio a Produzione non è coperto da una prova automatica |
| CRM | NON VERIFICATO in questo giro |
| PDF / WhatsApp | PASS sul totale (stessa chiamata al motore, stessa origine); il contenuto del documento non è confrontato riga per riga |

**Prove:** `tests/quote-to-order.test.mjs` (20 casi, compresi tutti i
fallimenti) · `tests/qa/preventivo-a-ordine.mjs` (39 controlli nel browser,
con ricaricamento vero).

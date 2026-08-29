# OrderLineSnapshot — il contratto

`src/product/order-snapshot.js` · schema versione **1** · API `InglyOrderSnapshot`

Una regola sola, da cui discende tutto il resto:

> **Uno storico si legge. Non si ricalcola, e non si inventa quando non c'è.**

---

## 1. Quando si congela

Alla **quotazione**, dentro `Quoter.saveQuote`, dove il calcolo esiste ancora:

```js
q.economicSnapshot = InglyOrderSnapshot.costruisci(_r, { spiegazione: this._spiega(…) });
```

`Pipeline.confirm` non ricalcola: prende quello che il preventivo aveva
congelato e lo porta sull'ordine. Se il preventivo non ne ha uno — perché è
anteriore a questa fase, o perché il motore non era disponibile — l'ordine nasce
con `stato: 'NO_SNAPSHOT'` e il motivo scritto, mai con numeri ricostruiti.

Uno snapshot già presente su un ordine **non viene sovrascritto** da una seconda
conferma: sarebbe la riscrittura di uno storico.

## 2. Che cosa contiene

```
{
  schemaVersion: 1,
  stato: 'SNAPSHOT' | 'NO_SNAPSHOT',
  costEngineVersion, pricingPolicyVersion, pricingPolicySnapshot,

  lines: [ {
    itemSnapshot: { itemId, sku, name, description, category, unit,
                    technology, material{id,name,unit}, machine{id,name} },
    quantity,
    unitCostSnapshot, unitPriceSnapshot,
    subtotalSnapshot, totalCostSnapshot,
    marginSnapshot, markupSnapshot,
    capturedAt,
  } ],

  totals: { subtotalCost, setupCost, overhead, totalCost,
            subtotalNet, totalGross, grossProfit, operatingProfit,
            marginPct, markupPct },

  discountSnapshot:   { requestedPct, appliedPct, amount, type,
                        floorTriggered, floorMarginPct },
  taxSnapshot:        { ratePct, amount, taxableBase },
  shippingSnapshot:   { cost, charged, margin },
  commissionSnapshot: { total, paymentPct, paymentFixed, marketplace },
  costBreakdownSnapshot: { voci: { <id>: { amount, detail, source, formula } },
                           vociPreviste: [ … 11 voci … ] },

  priceOverride?: { systemPrice, manualPrice, reason, user, at },
  capturedAt,
}
```

Alcune scelte che sembrano dettagli e non lo sono:

- **Il nome del materiale e della macchina accanto all'id.** Fra due anni l'id
  potrebbe puntare a un record rinominato o archiviato.
- **Le voci di costo assenti restano assenti, non a zero.** «Non pertinente» e
  «costa zero» non sono la stessa informazione.
- **Ogni voce porta `source` e `formula`.** La domanda che si fa a distanza di
  mesi non è «quanto», è «dove se n'è andato il margine».
- **L'aliquota è congelata.** Ricostruire un documento di due anni fa con
  l'aliquota corrente produrrebbe un totale che non è mai esistito.
- **Lo sconto è congelato in quattro facce**, richiesto e applicato separati:
  il pavimento di margine può aver ridotto quello richiesto, e chi rilegge deve
  poter vedere entrambi.

## 3. L'immutabilità è una proprietà, non una convenzione

`Object.freeze` **ricorsivo** alla costruzione, e di nuovo alla lettura — perché
il giro nel database restituisce una copia sciolta.

Verificato da `tests/order-snapshot.test.mjs`: riscrivere un totale, rinominare
una voce e aggiungere una riga sono tre test distinti, e il controllo negativo
(togliere `congela`) li fa fallire tutti e nove.

## 4. Gli ordini senza storico

| `classifica(ordine)` | Significato |
| -------------------- | ----------- |
| `SNAPSHOT` | il conto c'è, congelato |
| `NO_SNAPSHOT` | acquisizione tentata e fallita, con motivo |
| `LEGACY_NO_SNAPSHOT` | ordine anteriore a questa fase |

`leggi(ordine)` per il legacy restituisce, testuale:

> Dati economici storici non disponibili: questo ordine è precedente allo
> snapshot economico.

e `totaleStorico`, cioè il `value` che il vecchio record conservava, mostrato
per quello che è: **un totale, non un conto**. Nessuna deduzione, nessun margine
ricostruito. Un margine dedotto oggi dai costi di oggi sembrerebbe un dato
storico, ed è peggio di una casella vuota — perché una casella vuota si vede.

Non c'è nessuna migrazione che riempie gli ordini vecchi. È una scelta, non una
mancanza.

## 5. Il prezzo deciso a mano

`conOverride(snapshot, { manualPrice, reason, user })` **affianca**, non
sostituisce: `systemPrice` resta accanto a `manualPrice`, e i margini vengono
ricalcolati sul prezzo effettivamente venduto. Senza, un margine anomalo in un
report resta senza spiegazione e nessuno può sapere se è un errore o una scelta.

## 6. Il ricalcolo esplicito

L'unica strada che riporta al motore, e la percorre l'utente premendo
«Ricalcola con i dati di oggi».

`confronta(snapshot, calcoloAttuale)` restituisce cinque righe di differenza —
costo, prezzo netto, prezzo cliente, profitto lordo, margine — e non tocca
niente. La sostituzione avviene solo dopo conferma esplicita, e lascia nel
registro economico l'evento `ORDER_RECALCULATED` con il valore precedente.

**Limite dichiarato.** Le righe del preventivo storico non hanno un riferimento
all'articolo di magazzino — sono descrizioni con un costo digitato — quindi il
ricalcolo applica il motore e le politiche di **oggi** ai costi dichiarati
**allora**. Un rincaro del materiale non entra in questo confronto. Il pannello
lo dice a schermo: mostrare un delta che sembra completo e non lo è sarebbe
peggio che non mostrarlo.

Il riferimento riga → articolo è ciò che manca, ed è il lavoro del blocker
successivo (inventory transaction ledger).

## 7. Il registro economico

`registra(ordine, evento, dettaglio)` scrive in `ordine.economicLog`:
`{ at, user, action, before, after, reason }`.

Sei eventi: `ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_RECALCULATED`,
`ORDER_DISCOUNT_CHANGED`, `ORDER_PRICE_OVERRIDE`, `ORDER_CANCELLED`. Un evento
fuori elenco non entra.

Tetto di 100 eventi, i più recenti: un registro senza limite diventa il record
più pesante del database.

## 8. La duplicazione

`perDuplicazione(ordine)` copia **cosa vendere** — voci e quantità — e
`duplicatedFromOrderId`. Non copia lo snapshot: attribuirebbe a un ordine nuovo
costi che nessuno ha sostenuto in quel momento. Lo snapshot lo costruirà la
conferma del nuovo ordine, con i valori di allora.

## 9. Che cosa lo presidia

| Presidio | Dove | Cosa impedisce |
| -------- | ---- | -------------- |
| 76 test | `tests/order-snapshot.test.mjs` | 26 mutazioni dell'anagrafica, ognuna con controllo negativo |
| cricchetto | `scripts/audit-historical-pricing.mjs` | una vista storica che chiama un motore di prezzo |
| file consegnato | `tests/architecture-cost-engine.test.mjs` | lo snapshot che non arriva nel bundle |

Il controllo negativo del cricchetto è stato eseguito: inserendo una chiamata
all'adapter dentro `pannello()`, l'audit esce con codice 1 e nomina la riga.

Le eccezioni al cricchetto sono nominate una per una — `chiediRicalcolo`,
`statoDaPreventivo` — perché un'eccezione senza nome sarebbe un buco.

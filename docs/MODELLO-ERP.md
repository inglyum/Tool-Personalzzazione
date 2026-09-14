# Il modello ERP — una semantica, un servizio, una classificazione

> Moduli: `order-economics.js` · `production-model.js` · `order-sales-service.js` · `redditivita-tecnologia.js`
> Test: 21 + 25 + 22 + 17 unitari · `tests/qa/erp-end-to-end.mjs` (35 controlli browser)
> Audit di partenza: `docs/AUDIT-ERP-FASE-1.md`

---

## 1 · Quanto vale un record

Sedici nomi facevano lo stesso mestiere, e i tre che dicevano se un numero era
netto o lordo erano i meno usati: 3, 3 e 11 occorrenze contro 2881 di `value`.
Da qui in avanti si legge da sei funzioni.

```js
InglyOrderEconomics.getOrderRevenue(o)          // il netto, senza aggettivi
InglyOrderEconomics.getOrderRevenueNet(o)       // → { valore, noto, fonte, ambiguo? }
InglyOrderEconomics.getOrderRevenueGross(o)
InglyOrderEconomics.getOrderProductionCost(o)
InglyOrderEconomics.getOrderProfit(o)           // null se manca il costo
InglyOrderEconomics.getOrderMargin(o)
```

**Ognuna dichiara da dove ha preso il numero.** La provenienza non è
diagnostica: è ciò che permette a una schermata di sapere se mostra un fatto o
un ripiego.

La precedenza è `economic` → campi diretti → snapshot congelato. Uno snapshot
non in stato `SNAPSHOT` non conta: è un lavoro in corso, non una fotografia.

**Il ricavo senza aggettivi è il netto.** Chi vuole il lordo lo chiede per
nome, così la scelta resta visibile nel codice chiamante invece di dipendere
da quale campo capita di trovare.

### Il caso scomodo: `value`

Sui vecchi ordini `value` è **ambiguo per costruzione**. Misurato nel codice
che lo scriveva: in un punto vale `q.grossPrice || q.total` — lordo se c'è,
netto altrimenti; in un altro un prezzo di vendita calcolato al netto. Non è
recuperabile a posteriori quale dei due sia.

Si usa, perché un ordine leggibile male è meglio di un ordine muto, ma si
dichiara `ambiguo: true`. **Non si inventa un'IVA da togliergli**: sarebbe
attribuire il 22% a un dato che non lo dice.

Per lo stesso motivo un lordo mancante non si ricostruisce dal netto:
l'aliquota di un ordine di marzo non è detto sia quella di oggi, e un lordo
ricostruito è un numero mai esistito.

### Profitto e margine

Non esistono se manca uno dei due termini. Un profitto calcolato su un costo
mancante è il ricavo travestito, ed è il modo in cui un laboratorio crede di
guadagnare.

---

## 2 · Con che cosa è stato fatto

`category` veniva usato 576 volte e **non è la tecnologia**: dice che cosa è il
prodotto, non come è stato fatto. Un portachiavi può essere laser, UV o 3D.

```js
production: {
  primaryTechnology: 'laser',
  technologies: ['laser', 'uv'],
  isMixed: true,
  operations: [],
}
```

Otto tecnologie — `laser`, `3d`, `uv`, `dtf`, `tessile`, `manuale`,
`finitura`, `altro` — ciascuna con gli alias che i dati usano già
(`stampa3d`, `fdm`, `resina` → `3d`; `incisione`, `CO2` → `laser`).

**I record vecchi non si riscrivono.** `InglyProduction.leggi()` deduce la
tecnologia dai campi storici e marca `dedotta: true`: chi guarda deve poter
distinguere «me l'ha detto l'ordine» da «l'ho capito io». Nell'interfaccia la
differenza è un puntino accanto al badge.

Una deduzione da un campo solo **non è mai un misto**: dichiararlo tale
sarebbe inventare una seconda lavorazione.

### La regola che impedisce di raddoppiare

```js
InglyProduction.quotaPerTecnologia(ordine, 150)
// → { righe: [{ tecnologia: 'misto', importo: 150 }], ripartito: false, motivo: '…' }
```

Un ordine laser+UV da 150 € non vale 150 di laser **e** 150 di UV: vale 150.
Questa funzione restituisce **sempre** righe la cui somma è l'importo di
partenza. Finché non esisterà un'attribuzione economica per singola
lavorazione, il misto resta intero nella sua categoria. Quando esisterà, si
cambia qui e tutto il resto la segue.

Il modo di sbagliare è uno solo ma facilissimo: un `forEach` sulle tecnologie
invece che sugli ordini. Questa funzione esiste per renderlo impossibile.

---

## 3 · Order → Sale

L'audit aveva misurato cinque percorsi con quattro formule. Lo stesso ordine —
netto 150, lordo 183 — diventava una vendita da 0, 150 o 183 a seconda del
pulsante, e **zero su quattro percorsi su cinque**, perché leggevano `value` e
l'ordine canonico ha `total`.

```js
OrderSalesService.createSaleFromOrder(ordine, opzioni)  // → { ok, vendita, motivo, avvisi }
OrderSalesService.syncSaleFromOrder(ordine, vendita)
OrderSalesService.getOrderRevenue(ordine)
OrderSalesService.getSaleRevenue(vendita)
OrderSalesService.getProductionClassification(ordine)
```

Ci passano tutti e cinque: i tre di `orders/index.js` e i due automatici della
patch 042 — quest'ultimi creavano vendite da zero euro **in automatico**, ogni
volta che un ordine passava a «consegnato», senza che nessuno premesse niente.

### Le due regole

**Una vendita non nasce mai a zero da un ordine che vale qualcosa.** Se il
ricavo non si legge, non si crea e si dice perché. Uno zero scritto in archivio
diventa un buco nel fatturato che nessuno ritrova; un buco dichiarato si
ripara.

**Sincronizzare non cancella un incasso.** `syncSaleFromOrder` riallinea gli
importi ma lascia alla vendita quello che è suo: stato di pagamento, data,
canale, numero di fattura. Un ordine che cambia importo non può annullare un
pagamento già ricevuto.

Il consuntivo sostituisce il **costo**, mai il **ricavo**: il prezzo promesso
al cliente non si tocca. La differenza fra i due è lo scostamento.

---

## 4 · Performance per tecnologia

`InglyRedditivitaTecnologia.per(ordini)` aggrega ordini, ricavo, costo,
profitto, margine e — dove esiste un consuntivo — costo reale e scostamento.
Tutto dalla semantica canonica: nessuna lettura di campi a mano.

Un ordine senza ricavo non entra. Un ordine senza costo entra nel ricavo ma non
nel profitto, e la riga dichiara su quanti ordini il costo è noto.

La sezione in dashboard mostra la tabella e, sotto, la frase che spiega perché
i misti stanno in una categoria loro. Senza quella frase, chi legge «Misto» in
classifica non sa perché quel lavoro non è sotto «Laser».

---

## 5 · Cosa NON è stato fatto, e perché

**Non si riscrive lo storico.** Nessun ordine esistente è stato modificato per
uniformarlo al modello nuovo: quei record descrivono fatti avvenuti. Si
leggono, si deduce quello che si può, e si dichiara che è una deduzione.

**`production` non è obbligatorio.** Non entra fra i campi verificati del
passaggio quote→order: pretenderlo bloccherebbe chi preventiva a mano. Viaggia
se c'è, non si esige.

**Il routing non è obbligatorio.** `operations[]` esiste nel modello e si
popola quando il preventivo ne porta uno. Un ordine senza routing continua a
funzionare, ed è la maggioranza.

**I campi vecchi restano.** `amount` sulla vendita resta il netto perché è
quello che tutte le schermate esistenti leggono; `netAmount` e `grossAmount`
lo dicono senza ambiguità accanto. Cambiare `amount` avrebbe spostato il
fatturato storico.

---

## 6 · Una nota di percorso

Il primo tentativo aveva messo badge e filtro in `Orders` — che ha `_COLS`, i
filtri, il rendering completo. Misurato a runtime: `Orders` non disegna niente.
Gli ordini li disegna `GestioneOrdini` (patch 052), e `kanban-board` e
`orders-kpis` non esistono nel DOM.

È il motivo per cui in questo progetto si misura prima di scrivere: un modulo
che sembra vivo può non esserlo, e il lavoro fatto dentro non si vede mai.

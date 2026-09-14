# FASE 1 — Mappa tecnica del modello dati

> Misurata su 230 file sorgente e sull'applicazione in esecuzione, non letta a occhio.
> Nessuna correzione applicata: questo documento è il preliminare, come richiesto.
> Strumento: `scripts/audit-erp.mjs` (riproducibile).

---

## 0 · Il difetto critico, in una riga

**Lo stesso ordine diventa una vendita da €0, €150 o €183 a seconda del
pulsante che si preme.** Misurato nell'applicazione, non dedotto.

Un ordine con netto 150, lordo 183, costo 60:

| Percorso che crea la vendita | Ordine dal flusso **canonico** | Ordine dal flusso **legacy** |
| --- | ---: | ---: |
| `orders/index.js` — `q.grossPrice \|\| 0` | **0** | 183 |
| `quoter/index.js` — `o.value \|\| o.amount \|\| 0` | **0** | 183 |
| patch 042 riga 101 — `value\|\|price\|\|grossPrice\|\|amount` | **0** | 183 |
| patch 042 riga 166 — `value \|\| 0` | **0** | 183 |
| `InglyOrderEconomics.ricavoNettoOrdine` | **150** | **150** |

Due difetti sovrapposti:

1. **L'ordine canonico vale zero.** `InglyQuoteToOrder.invia()` scrive
   `total`, `totalNet`, `totalGross`, `totalCost` — e **non** `value`. Quattro
   percorsi su cinque leggono `value` per primo e non trovano niente.
2. **Netto contro lordo.** Dove un importo esce, esce **183** (IVA inclusa)
   mentre il lettore canonico dice **150**. Una divergenza del 22% sullo stesso
   ordine, cioè esattamente l'IVA, a seconda di chi legge.

Questo è il motivo per cui la consolidazione va fatta prima di aggiungere
qualsiasi cosa.

---

## 1 · Il vocabolario economico

Sedici nomi diversi per «quanto vale questo record», e nessuna gerarchia
dichiarata fra loro.

| Campo | Occorrenze | Concentrato in |
| --- | ---: | --- |
| `value` | 2881 | catalog(394) settings(278) marketing(200) — **in gran parte non economico** (valori di form) |
| `amount` | 410 | sales(86) settings(77) ai(48) |
| `total` | 332 | orders(42) p:052(21) p:099(19) |
| `cost` | 259 | items(45) catalog(27) quoter(21) |
| `price` | 251 | catalog(28) p:100(20) orders(19) |
| `salePrice` | 119 | catalog(54) sales(13) |
| `totalCost` | 82 | cost-breakdown(26) quoter(6) orders(5) |
| `unitCost` | 79 | inventory-ledger(13) cost-breakdown(9) |
| `grossPrice` | 50 | orders(11) quoter(10) |
| `totalGross` | 20 | quoter(7) order-economics(5) |
| `netPrice` | 17 | cost-breakdown(3) quoter(2) |
| `costTotal` | 11 | orders(3) order-economics(3) |
| `totalNet` | 10 | order-economics(3) orders(2) |
| `revenueNet` / `revenueGross` | 3 / 3 | solo `order-economics` |
| `finalPrice` | 2 | solo `order-fields` |

**Il problema non è che siano tanti — è che `value` non dice se è netto o
lordo, `total` nemmeno, e `cost` non dice se è unitario o totale.** I nomi che
lo dicono (`totalNet`, `revenueGross`, `costTotal`) sono i meno usati: 3, 3 e
11 occorrenze contro 2881 di `value`.

Esiste già un lettore canonico — `InglyOrderEconomics` — con
`ricavoOrdine`, `ricavoNettoOrdine`, `costoOrdine`. **Nessuno dei percorsi di
creazione vendita lo usa.**

---

## 2 · Stato: `status` e `stage` convivono

- `status` — 702 occorrenze in 67 file
- `stage` — 180 occorrenze in 32 file
- `paymentStatus` — 12 occorrenze in **2** file

L'ordine canonico li scrive **entrambi**: `CAMPI_ORDINE = ['id','quoteId','name','total','stage','status']`.

**54 valori distinti** confrontati nel codice, in tre lingue e due convenzioni:

```
pagato×108  da_pagare×35  paid×14  done×10  completed×8  confermato×7
bozza×5  inviato×5  accettato×5  convertito×5  pending×5  sent×5
delivered×4  draft×4  in_attesa×3  annullato×3  in_produzione×2
completato×2  backlog×1  sold×1  invoiced×1  ready×1  working×1  …
```

`pagato` e `paid` sono lo stesso stato scritto in due lingue: 122 confronti
complessivi che possono divergere. `completato`, `completed` e `done` sono tre.

---

## 3 · I percorsi: quanti scrivono cosa

| | Punti di scrittura | File distinti |
| --- | ---: | ---: |
| Ordini | 65 | **23** |
| Vendite | 32 | **13** |
| Preventivi | 13 | 4 |

**23 file scrivono ordini. 13 scrivono vendite.** Nessuno di questi passa da un
servizio: ognuno costruisce il record a modo suo, e la tabella al §0 è la
conseguenza.

Riferimenti incrociati: `quote→order` 51 punti, `order→sale` 74 punti — sparsi
su patch 042, orders, sales, p:064, quote-to-order.

**`OrderSalesService` — richiesto dalla Fase 7 — non esiste.** Verificato a
runtime: `typeof window.OrderSalesService === 'undefined'`.

---

## 4 · Tecnologia di produzione: non esiste come modello

| Campo | Occorrenze |
| --- | ---: |
| `primaryTechnology` | **0** |
| `technologies` | **0** |
| `operations` | 5 (e nessuna è una lavorazione: sono altre cose) |
| `technology` | 13 |
| `tecnologia` | 220 (128 in un seed di catalogo) |
| `tech` | 629 (151 in p:078, 104 in p:087 — quasi tutto B2B, non produzione) |
| `machineId` | 19 |
| `category` | 576 |

Esiste `InglyOrderFields.tecnologia(ordine)`, che legge una **singola**
tecnologia da quattro campi possibili con alias (`3d`/`stampa3d`/`fdm` →
`print3d`). È il lettore canonico e funziona, ma il modello sottostante è
**mono-tecnologia**: non c'è posto dove scrivere «laser + UV».

`category` è usato 576 volte e **non è la tecnologia**: è la categoria
merceologica del prodotto. La Fase 3 ha ragione a separarli.

**Il percorso canonico quote→order non trasferisce alcuna tecnologia.**
`invia()` porta `total/totalNet/totalGross/totalCost/economic/economicSnapshot/costBreakdown/pricingSnapshot/currentPricing/items` — nessun campo di produzione.

---

## 5 · Snapshot economico: c'è, ed è buono

| Campo | Occorrenze |
| --- | ---: |
| `economicSnapshot` | 37 (orders 16, order-snapshot 8) |
| `economic` | 21 |
| `calculationVersion` | 8 |

Il modello c'è ed è coerente: l'ordine canonico porta **tre copie dichiarate**
con tre significati diversi — `costBreakdown` (le voci di oggi),
`pricingSnapshot` (congelato, mai più toccato), `currentPricing` (quello che si
sta facendo davvero). La differenza fra il secondo e il terzo **è** lo
scostamento.

Va mantenuto come richiesto. Il problema non è lo snapshot: è che
**nessun percorso di vendita lo legge**.

---

## 6 · Gli archivi, contati sull'installazione nuova

| Store | Record | Nota |
| --- | ---: | --- |
| `catalog` | 70 | popolato dal seed |
| `materials` | 172 | popolato dal seed |
| `gadgets` | 61 | popolato dal seed |
| `inventory` | 4 | popolato dal seed |
| `items` | **0** | esiste, vuoto — è il magazzino unificato v56 |
| `quotes` `orders` `sales` `clients` | 0 | vuoti, corretto |
| `payments` | **0, e 0 accessi in tutto il codice** | store esistente mai usato |
| `pipeline` | 0, ma **13 punti di scrittura** | «ritirata», e ancora scritta |
| `cost_entries` `timelogs` `order_events` `workflow_steps` | 0 | esistono, poco usati |

**Tre magazzini paralleli:** `materials` (172 record, seed), `items` (0, il
«unified» v56), `inventory` (4, seed). `gadgets` e `components` sono altri due.
Il registro movimenti (`inventory_ledger`) li indicizza con chiave composta
`store:id`, quindi sa distinguerli — ma le viste no.

---

## 7 · Debito architetturale misurato

- **44 patch riscrivono `App.navigate` o `App.renderSection`.** Ogni
  navigazione attraversa quarantaquattro strati di wrapper.
- **23 file scrivono ordini**, 13 scrivono vendite: nessun repository.
- `pipeline` è dichiarata ritirata (redirect verso `gestione_ordini`) ma ha
  ancora 13 punti di scrittura e 34 accessi.
- Patch 106 riscrive intere viste con un `setInterval` da 600 ms. È già stato
  tolto per `forecaster`; ne restano 12.

---

## 8 · Risposte dirette alle domande della Fase 1

**Duplicazioni:** 4 formule di ricavo per la vendita · 3 magazzini + 2 elenchi
paralleli · `status` e `stage` sullo stesso record · `pagato`/`paid`,
`completato`/`completed`/`done`.

**Campi con significato diverso:** `value` (a volte lordo, a volte un valore di
form), `total` (netto nel percorso canonico, lordo altrove), `cost` (unitario o
totale a seconda del chiamante).

**Percorsi multipli Order→Sale:** 5 misurati, con 4 risultati diversi sullo
stesso ordine.

**Percorsi multipli Quote→Order:** il canonico (`InglyQuoteToOrder.invia`) più
almeno 6 punti in `orders/index.js` che scrivono ordini da preventivi con campi
diversi.

**Dati nello snapshot ma mancanti nell'ordine:** nessuno — l'ordine canonico
porta lo snapshot intero. Il difetto è opposto.

**Dati nell'ordine ma mancanti nella vendita:** **tutti quelli economici.** La
vendita riceve solo `amount`, e da un campo che spesso non esiste. Non riceve
costo, margine, snapshot, tecnologia, righe.

---

## 9 · L'ordine di lavoro che ne consegue

1. **Fase 2 — semantica unica** (`getOrderRevenue` ecc. su `InglyOrderEconomics`
   che già esiste). Senza questo, tutto il resto poggia sul nulla.
2. **Fase 7 — `OrderSalesService`**: un solo servizio, e i 5 percorsi che ci
   passano. È qui che si chiude il difetto del §0.
3. **Fase 3/4 — modello produzione** (`production.primaryTechnology`,
   `technologies[]`, `isMixed`, `operations[]`), additivo, con
   `InglyOrderFields.tecnologia()` come lettore di ripiego per i legacy.
4. **Fasi 6, 8, 9, 10** — propagazione e UI.
5. **Fasi 11, 12** — dashboard per tecnologia, con i **misti in una categoria a
   parte** e nessuna ripartizione inventata, come hai chiesto.

Le fasi 13-22 poggiano su queste. Le 23-24 le verificano.

---

## 10 · Cosa NON è stato toccato in questa fase

Niente. Questa fase è solo misura, come richiesto. Nessun file sorgente
modificato, nessun comportamento cambiato. L'unico file nuovo è
`scripts/audit-erp.mjs`, che rigenera questa mappa su richiesta.

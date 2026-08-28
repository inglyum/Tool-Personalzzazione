# SMART QUOTE APPAREL — analisi del motore e piano

> Il modulo produce preventivi. Il problema non è che manchino funzioni: è che
> il modello di costo sbaglia il conto, e sbaglia di più sugli ordini che
> valgono di più.

Documento di proposta. Nulla di ciò che segue è ancora implementato.

---

## 1. Cosa è stato misurato

Isolando `calcLine` e `calcQuote` dal modulo spedito
(`src/legacy/patches/069-smart-quote-apparel-v2-…js`) ed eseguendoli con le
impostazioni predefinite — t-shirt 3,20 €, DTF, margine impostato 40%:

| qty | costo/pz | prezzo/pz | totale | sconto auto | margine reale |
|----:|---------:|----------:|-------:|------------:|--------------:|
|   1 |     7,31 |     10,23 |  10,23 |          0% |         28,6% |
|  10 |     7,31 |      9,72 |  97,21 |          5% |         24,8% |
|  50 |     7,31 |      8,49 | 424,66 |         17% |         13,9% |
| 100 |     7,31 |      7,67 | 767,46 |         25% |          4,8% |
| 200 |     7,31 |      6,96 |1391,66 |         32% |     **−5,0%** |

### Difetto 1 — lo sconto quantità scende sotto il costo (grave)

`prezzo = costo × (1 + margine) × (1 − sconto)`. A 200 pezzi:
`1,40 × 0,68 = 0,952`. Lo sconto automatico supera il ricarico e il preventivo
esce **sotto costo**, senza che nulla lo segnali.

La radice è concettuale: lo sconto è scritto a mano in una tabella invece di
*emergere* dai costi una tantum spalmati sulla quantità.

### Difetto 2 — nessuna distinzione fra costo per pezzo e costo per lavoro (grave)

La serigrafia costa `3,20 €/pz` sempre: 3,20 € per un pezzo, 640 € per duecento.
Nella realtà è quasi tutta una tantum (telaio, emulsione, registro, prove) e poi
pochi centesimi a pezzo. Il pezzo singolo è sottoprezzato di decine di euro, la
tiratura lunga è fuori mercato. Stesso schema per il ricamo (digitalizzazione).

### Difetto 3 — la superficie di stampa non esiste (grave)

Un logo 5×5 cm e una stampa A3 a tutto fronte costano identici: 2,80 €. Non c'è
alcun campo di dimensione. Ma il DTF si compra a metro di film, il vinile a cm²,
la sublimazione a foglio, il ricamo a migliaia di punti.

### Difetto 4 — «margine 40%» restituisce 28,6% (da correggere)

Il campo si chiama margine e si comporta da ricarico. `print3d-cost.js` la
distinzione ce l'ha già (`prezzoDaMargine` / `prezzoDaRicarico`).

### In più

La dashboard somma **tutti** i preventivi in «Valore totale» e «Profitto
stimato», bozze e annullati compresi.

---

## 2. Il principio

```
costo del lavoro   = setup file + telai/colore + digitalizzazione + prove
costo del capo     = listino fornitore (per taglia, per colore)
costo decorazione  = Σ posizioni (superficie × €/cm² + tempo × €/h)
scarto             = perdibile × tasso / (1 − tasso)

costo/pz  = capo + decorazione + scarto + confezione + lavoro ÷ quantità
prezzo/pz = costo/pz ÷ (1 − margine)          ← margine, non ricarico
```

Il prezzo scende con la quantità **perché il costo scende davvero**, non perché
una tabella dice di scontare il 32%. La formula dello scarto è già in
`src/product/print3d-cost.js`: si riusa quella.

---

## 3. Roadmap

Legenda: **[+]** aggiunge · **[~]** trasforma · **[−]** rimuove · **[!]** corregge

### Fase A — Il motore di costo *(blocca tutto il resto)*

| | |
|---|---|
| A1 [~] | Estrarre il calcolo in `src/product/apparel-cost.js`: funzione pura, zero DOM |
| A2 [!] | Separare una tantum da per pezzo: `costo/pz = perPezzo + unaTantum/qty` |
| A3 [−] | `qtyDiscounts` come meccanismo di prezzo — resta come sconto commerciale con pavimento di margine |
| A4 [!] | Margine e ricarico come due funzioni distinte e dichiarate |
| A5 [+] | Superficie: DTF/vinile a cm², sublimazione a foglio, ricamo a 1.000 punti, serigrafia a colore |
| A6 [+] | Tasso di scarto per tecnica |
| A7 [+] | Maggiorazioni: taglia, capo scuro (sottobase), capo fornito dal cliente |
| A8 [+] | Posizioni multiple per capo (fronte, retro, manica, etichetta collo) |
| A9 [+] | Soglia di convenienza fra tecniche |

### Fase B — Un solo archivio

Il modulo si è costruito quattro archivi accanto a moduli che fanno già la
stessa cosa.

| | |
|---|---|
| B1 [−] | `ingly_apparel_products_v1` → categoria apparel in **Magazzino** |
| B2 [−] | `ingly_apparel_stock_v1` → giacenze di Magazzino |
| B3 [−] | Costante `MACHINES` (sei macchine nel codice) → modulo **Macchine** |
| B4 [~] | `clientName` testo libero → collegamento a **Clienti**, testo come ripiego |
| B5 [~] | Energia e manodopera locali → costi fissi globali |
| B6 [~] | `localStorage` → IndexedDB con migrazione versionata (framework già esistente) |

### Fase C — La precisione del mestiere

| | |
|---|---|
| C1 [+] | Importazione listini fornitore capi (CSV/XLSX) con fasce taglia e colore |
| C2 [+] | **Nesting del foglio DTF** — quante grafiche entrano in un metro di film |
| C3 [~] | `timeMin` unico → ciclo macchina, manipolazione, avviamento separati |
| C4 [+] | Preventivo a scaglioni (50/100/200 nello stesso documento) |
| C5 [+] | Validità, versione, tracciamento accettazione |
| C6 [+] | Tolleranza sulle tirature e politica di rifacimento |

### Fase D — I documenti

| | |
|---|---|
| D1 [~] | PDF da elenco righe a documento tessile: schema posizioni, distinta taglie, tecnica per posizione |
| D2 [+] | Distinta di produzione (file, posizione, gradi, secondi, pressione) |
| D3 [+] | Packing list per scatola e taglia |

### Fase E — Abbonamento *(vedi §5)*

| | |
|---|---|
| E1 [!] | Firma della licenza non falsificabile — blocca il resto della fase |
| E2 [+] | Ciclo: pagamento → emissione → scadenza → tolleranza → blocco |
| E3 [+] | Canale di aggiornamento |
| E4 [+] | Esportazione e cancellazione dati cliente (GDPR) |

### Fase F — Il presidio

| | |
|---|---|
| F1 [+] | Test matematici sul motore, sul modello dei 30 del 3D |
| F2 [+] | Test che fallisce se una qualunque combinazione qty/sconto scende sotto il pavimento di margine |
| F3 [+] | Test di migrazione: nessun dato perso nella fase B |

---

## 4. Cosa si toglie

| Si rimuove | Perché | Cosa lo sostituisce |
|---|---|---|
| `qtyDiscounts` come prezzo | produce preventivi sotto costo | una tantum ÷ quantità |
| `TECHS[].baseCost` | costo piatto che ignora la superficie | costo parametrico cm²/foglio/punti/colore |
| `ingly_apparel_products_v1` | secondo catalogo prodotti | Magazzino |
| `ingly_apparel_stock_v1` | seconde giacenze mai allineate | giacenze di Magazzino |
| Costante `MACHINES` | sei macchine nel codice | modulo Macchine |
| Energia/manodopera locali | terza copia della tariffa oraria | costi fissi globali |
| KPI su tutti i preventivi | bozze e annullati gonfiano il totale | solo confermati |

---

## 5. Vendibilità a canone

### Il blocco numero uno

La licenza si falsifica in cinque minuti. `InglyLicense._sig` è
`h = (h × 31 + carattere) >>> 0` con il sale `ingly-belice-2026` **scritto nel
file consegnato al cliente**: chiunque apra il sorgente genera un codice
Enterprise valido a vita.

È peraltro ciò che le regole del progetto già vietano — nessun segreto nel
frontend. Finché resta così, i pacchetti mensili funzionano sulla fiducia.

### I sei tasselli

| Manca | Oggi | Serve |
|---|---|---|
| Licenza verificabile | firma simmetrica, sale nel file | firma asimmetrica o attivazione online periodica |
| Ciclo abbonamento | solo il blocco a scadenza avvenuta | pagamento → emissione → promemoria → tolleranza → blocco |
| Aggiornamenti | file da 9,7 MB consegnato a mano | area download per licenza, o controllo versione in app |
| Più postazioni | dati nel browser di un computer | sincronizzazione verificata, o backup condiviso dichiarato |
| Dati del cliente | esportazione parziale | esportazione completa e cancellazione su richiesta |
| Assistenza | non definita | un canale e un tempo di risposta per piano |

L'ordine conta: **la licenza per prima**, perché tutto il resto presuppone di
sapere chi ha diritto a cosa.

### Proposta di confezionamento

I quattro piani esistono già (19/49/99/199 €) e l'apparel entra da Pro in su,
tutto o niente. Con le fasi A–D diventa abbastanza ricco da graduarlo.

| Funzione apparel | Starter | Pro | Business | Enterprise |
|---|:--:|:--:|:--:|:--:|
| Preventivo a una posizione | — | sì | sì | sì |
| Posizioni multiple + superficie | — | sì | sì | sì |
| PDF cliente con distinta taglie | — | sì | sì | sì |
| Distinta di produzione | — | sì | sì | sì |
| Nesting DTF e costo film reale | — | — | sì | sì |
| Listini fornitore importabili | — | — | sì | sì |
| Preventivo a scaglioni | — | — | sì | sì |
| Più postazioni sincronizzate | — | — | — | sì |
| Documenti personalizzati | — | — | — | sì |

Proposta, non decisione. La logica: Pro dà un preventivatore tessile completo,
Business dà i due strumenti che fanno guadagnare tempo e margine a chi produce
ogni giorno — il nesting e i listini.

---

## 6. Da dove partire

**A2** — separare i costi una tantum dai costi per pezzo. Mezza giornata sul
motore, chiude da sola i difetti 1 e 2, e trasforma lo sconto quantità da bugia
in conseguenza.

Subito dopo **A1** (motore puro) e **F2** (test del pavimento di margine):
insieme fanno sì che un difetto di questa famiglia non possa più tornare in
silenzio.

La fase B non è urgente per il cliente, ma lo è per chi sviluppa: ogni funzione
aggiunta prima di unificare gli archivi va poi scritta due volte.

---

I numeri della sezione 1 vengono dall'esecuzione del codice spedito. Le voci di
costo della sezione 2 descrivono la struttura del calcolo: i valori vanno
riempiti con i listini e i tempi reali del laboratorio, non con stime.

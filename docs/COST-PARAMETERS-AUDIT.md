# Audit dei parametri di costo

Tre valori erano stati proposti in un ciclo precedente e **non applicati**, in
attesa di una verifica. Questo documento è quella verifica: per ciascuno, dove
vive, chi lo usa, cosa cambia in euro, e la decisione che ne segue.

Le cifre non sono stime: vengono da `InglyCostEngine` eseguito sui casi
descritti sotto.

---

## Il caso di prova

Un pezzo FDM realistico, usato per misurare tutti e tre i parametri:

| Voce | Valore |
|---|---|
| Ore macchina | 5 h |
| Materiale | 60 g a 22 €/kg |
| Energia | 150 W, 0,25 €/kWh, ciclo 60% |
| Manodopera | 18 €/h, 10 min di avviamento, 5 min di finitura |
| Scarto | 8% |
| Confezione | 0,90 €/pezzo |

E un secondo caso, un lavoro lungo da 24 h e 300 g, perché è lì che i costi
orari pesano davvero.

---

## A. Manutenzione — 0,12 €/h → 0,05 €/h

| | |
|---|---|
| **Nome** | `maintenancePerHour` |
| **Valore attuale** | 0,12 €/h (FDM) · 0,20 €/h (resina) |
| **Dove vive** | `patches/108` riga 435, valore iniziale del campo del preventivatore 3D |
| **Formula** | `maintenancePerHour × ore` — voce «Manutenzione e consumabili» di `InglyCostEngine`, profilo `print3d` |
| **Chi lo usa** | Smart Quoter 3D. Laser, UV e DTF hanno la stessa voce nel motore ma nessun valore iniziale: chi non lo compila paga zero manutenzione |
| **Nel motore** | nessun valore predefinito: `pos(i.maintenancePerHour)` vale 0 se non arriva |

**Impatto misurato** (solo questo parametro, caso da 5 h):
costo/pezzo **8,696 € → 8,316 €**, cioè **−0,38 €** (−4,4%).

**Cosa dicono i dati dell'applicazione.** 0,12 €/h su una macchina da 2000 h di
vita utile sono 240 € di manutenzione in tutta la vita: ugelli, cinghie, piatti
PEI, lubrificanti. 0,05 €/h sono 100 €, che su 2000 ore coprono si e no due
piatti e un set di ugelli.

**Decisione: NON si abbassa a 0,05.** Il valore attuale non è alto: è la stima
prudente che serve a non scoprire a fine anno che la manutenzione non era nel
prezzo. Abbassarlo del 58% toglie 0,38 € da ogni pezzo di 5 ore senza che
nessun dato dell'applicazione lo giustifichi.

**Quello che resta da fare — NON APPLICATO in questa fase.** Il numero
dovrebbe venire dalla macchina, non da un valore iniziale del modulo:
`InglyMachineCost.normalizza()` legge già `maintenancePerHour` dalla scheda
macchina, e `InglyProduzione` legge il parco. Il preventivatore 3D però non
sceglie fra le macchine registrate: sceglie fra un elenco di preset interni
(`MACH`), che è un secondo registro parallelo al parco.

Collegare i due è una modifica di integrazione, non una taratura di parametro,
e va fatta con il suo collaudo: qui sarebbe entrata di straforo dentro una
scheda che parla d'altro. Resta come lavoro dichiarato, non come cosa fatta.

---

## B. Macchina — 400 € / 2000 h → 299 € / 3000 h

| | |
|---|---|
| **Nome** | `machinePrice`, `machineLifeHours` |
| **Valore attuale** | preset «Personalizzata»: 400 € su 2000 h = **0,2000 €/h** |
| **Proposto** | 299 € su 3000 h = **0,0997 €/h** |
| **Dove vive** | `patches/108` righe 5-19, elenco delle stampanti FDM |
| **Formula** | `(prezzo − valore residuo) ÷ ore di vita utile`, in `InglyMachineCost.costoOrario` |
| **Chi lo usa** | Smart Quoter 3D. Il Laser B2B ha il suo parco, il Product Builder legge le macchine registrate |

**Il confronto con i preset reali dell'applicazione**, che sono macchine vere
con prezzi veri — tutti e undici:

| Macchina | € | ore | €/h |
|---|---:|---:|---:|
| Bambu A1 Mini | 229 | 3000 | 0,0763 |
| Bambu A1 | 299 | 3000 | 0,0997 |
| Prusa Mini+ | 429 | 4000 | 0,1072 |
| Ender 3 V3 SE | 229 | 2000 | 0,1145 |
| Ender 3 S1 Pro | 299 | 2500 | 0,1196 |
| **Bambu P1S** | **699** | **5000** | **0,1398** ← mediana |
| Bambu Lab P2S | 749 | 5000 | 0,1498 |
| Voron 2.4 | 900 | 6000 | 0,1500 |
| CR-10 Smart Pro | 340 | 2000 | 0,1700 |
| Prusa MK4S | 1099 | 5000 | 0,2198 |
| Bambu X1 Carbon | 1199 | 5000 | 0,2398 |

**Mediana 0,1398 €/h · media 0,1442 €/h.**

**Sul valore proposto.** 299 €/3000 h non è un numero arbitrario: è
esattamente il preset **Bambu A1**, una macchina reale e attuale. È il
secondo €/h più basso degli undici, quindi come punto di partenza per una
macchina generica è ottimistico — ma non è fuori scala come sembrava a una
prima lettura dell'elenco troncato.

**Sul valore attuale.** 0,2000 €/h è più caro di nove preset su undici. Come
punto di partenza per una macchina non descritta, sovrastima.

**Applicato: 420 € su 3000 h = 0,1398 €/h**, la mediana esatta degli undici.
Chi sceglie «Personalizzata» sta descrivendo una macchina che il programma non
conosce: il punto di partenza giusto è il centro di quelle che conosce, non la
più cara né la seconda più economica.

**Impatto misurato** (caso da 5 h, solo questo parametro):
voce macchina **1,000 € → 0,700 €**, costo/pezzo **8,696 € → 8,370 €**, cioè
**−0,326 €** (−3,7%). La proposta iniziale (0,05 + 299/3000) toglieva invece
0,926 € (−10,6%).

Il delta è più grande della sola differenza di ammortamento perché il costo
macchina entra anche nella base dello scarto: abbassarlo toglie qualcosa due
volte.

Quando una macchina è registrata nel parco, comanda quella.

## C. Confezionamento — dove va

| | |
|---|---|
| **Nome** | `packagingPerUnit`, `packagingItems[]` |
| **Dove vive** | `InglyCostEngine`, voce `packaging` fra i costi **per pezzo** |
| **Escluso dallo scarto** | sì: un pezzo fallito non viene confezionato |

**Le cinque possibilità della direttiva, e perché una sola regge.**

1. *Parte del costo industriale* — sì. La scatola esiste per quel pezzo e si
   consuma con quel pezzo.
2. *Overhead* — no. Le spese generali si ripartiscono su una base (ore, costo);
   la confezione si conta, non si ripartisce.
3. *Voce separata* — è già separata **nella spiegazione**, e deve restarlo: si
   vede quanto pesa. Ma separata nel racconto, non fuori dal costo.
4. *Costo variabile* — sì, ed è il motivo per cui sta nei costi per pezzo e non
   in quelli una tantum: dieci pezzi, dieci scatole.
5. *Componente del costo aziendale* — no. Sarebbe la stessa cosa dell'overhead,
   con l'effetto di far sparire dal prezzo del singolo pezzo una spesa che quel
   pezzo causa.

**Decisione: costo diretto variabile per pezzo, dentro il costo industriale,
mostrato come voce propria, escluso dalla base dello scarto.** È quello che il
motore fa già.

### Lo stato reale nei sei moduli, misurato

| Modulo | Prima | Coerente? |
|---|---|---|
| Smart Quoter 3D | `packagingItems[]` → motore | ✔ |
| Laser B2B | `_packCost` 0,30 €/pezzo sommato al costo pezzo | ✔ stessa collocazione |
| Product Builder | **contato due volte** | ✘ corretto |
| Catalogo | nessuna voce: la confezione sta dentro il costo che l'utente scrive | ✔ per assenza |
| Apparel | passa dal motore | ✔ |
| Ordini / snapshot | congela la voce così com'è | ✔ |

**Il difetto trovato nel Product Builder.** `recompute()` sommava
`state.packaging` e `state.extra` dentro `materialCost`, e poi passava gli
stessi due valori a `Data.price({ packaging, other })`, che li aggiunge come
voci separate. Ogni euro di confezione entrava due volte nel costo e quindi nel
prezzo. La spiegazione del prezzo (`priceExplain`) invece li legge una volta
sola: prezzo e spiegazione non tornavano.

---

## Riepilogo

| Parametro | Prima | Dopo | Motivazione | Impatto |
|---|---|---|---|---|
| Manutenzione FDM | 0,12 €/h | **0,12 €/h** (invariato) | 0,05 €/h non copre due piatti e un set di ugelli su 2000 h; nessun dato nell'applicazione lo sostiene | — |
| Manutenzione, provenienza | valore del modulo | **non applicato** | il preventivatore 3D sceglie fra preset interni, non fra le macchine registrate: collegarli è integrazione, non taratura | da misurare quando si farà |
| Macchina «Personalizzata» | 400 €/2000 h (0,2000 €/h) | **420 €/3000 h (0,1398 €/h)** | mediana degli undici preset reali: 0,2000 è più caro di nove, 0,0997 è il secondo più economico | −0,326 €/pezzo sul caso da 5 h |
| Confezione | doppio conteggio nel Product Builder | **una volta sola, costo diretto per pezzo** | è un costo variabile causato dal pezzo | −1× il valore della confezione sul prezzo del Product Builder |

## Come si verifica

```bash
npm test                                                  # tests/costi-parametri.test.mjs
node tests/qa/product-builder-confezione.mjs dist/INGLY-OS.html
```


---

## Nota di correzione

La prima stesura di questa scheda leggeva soltanto otto degli undici preset
FDM — i tre Bambu di testa erano fuori dal blocco letto — e ne concludeva che
0,0997 €/h fosse «sotto ogni macchina dell'elenco». Non è vero: 0,0997 €/h è
il Bambu A1, e sotto c'è ancora il Bambu A1 Mini. La mediana corretta è
0,1398 e non 0,1500, e il valore applicato è 420 €/3000 h.

Resta in piedi la conclusione: 0,2000 €/h sovrastima, 0,0997 €/h è il
secondo valore più basso di undici macchine reali, e per una macchina non
descritta il punto di partenza giusto è la mediana.

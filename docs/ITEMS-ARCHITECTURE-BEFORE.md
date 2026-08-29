# ITEMS-ARCHITECTURE-BEFORE — cosa c'era, prima di toccarlo

Il pre-audit richiesto dalla Fase 29, fatto prima di modificare il file.
Risultato principale: **l'indicazione «items ha 8 formule» era fuorviante.**

---

## Il reperto

`mod:items/index.js` è un file da 3.347 righe che contiene **tre cose diverse**:

| Da | A | Cosa | Righe |
|---|---|---|---:|
| 78 | 875 | `Materials` — anagrafica e giacenze dei materiali | 797 |
| 876 | 2.088 | `ItemsModule` — anagrafica articoli, magazzino, foto | 1.212 |
| 2.089 | 2.271 | `ItemsPicker` — selettore articoli per altri moduli | 182 |
| 2.272 | 2.700 | **`Quoter._pdf*`** — il generatore PDF del preventivo | 428 |

Le otto formule attribuite a «items» stavano tutte nell'ultimo blocco:
**non erano prezzi di articoli, era la matematica del preventivo**, in un file
che con i preventivi non c'entra.

Il commento sopra i totali diceva:

> `// Totals — allineati 1:1 allo Smart Quoter`

Un'aspirazione, non una garanzia. È la terza copia della stessa formula —
dopo quella nel Quoter e quella nel suo PDF interno — e nessun test la teneva
allineata. Il documento che arriva al cliente e la schermata che il laboratorio
guarda potevano raccontare due cifre diverse senza che nessuno se ne accorgesse.

---

## Cosa gestisce davvero Items

| Dato | Dove vive | Chi lo scrive |
|---|---|---|
| Articoli (SKU, nome, categoria, foto) | IDB `items` | `ItemsModule` |
| Materiali (nome, unità, costo, fornitore) | IDB `materials` | `Materials` |
| Giacenze e soglie | negli stessi record | entrambi |
| Costo e prezzo di vendita | campi `cost` / `salePrice` | inseriti a mano |

**Non calcola costi di produzione.** Il costo di un articolo è un numero
digitato, non derivato: non c'è un percorso da materiale + macchina + tempo
verso il costo. È la ragione per cui la migrazione a `InglyCostEngine` qui non
somiglia a quella dei quoter — non c'è un motore da sostituire, c'è un motore
che manca.

## Chi lo chiama

| Modulo | Cosa prende |
|---|---|
| Quoter | `ItemsPicker` per aggiungere voci al preventivo |
| Catalogo | i materiali per il calcolo del prodotto |
| Product Builder | materiali e macchine come sorgenti |
| Ordini | gli articoli per le righe d'ordine |
| Dashboard | le giacenze sotto soglia |

## Le formule trovate, classificate

| Riga | Cosa | Classe | Azione |
|---:|---|---|---|
| 1050 | `(sale − cost) / sale × 100` | lettura di margine | consolidata in `InglyCostEngine.margineDi` |
| 2072 | `(salePrice − cost) / cost × 100` | lettura di **ricarico**, etichettata `mk` | idem, con `ricaricoDi` |
| 2486-2487 | prezzo di riga nel selettore PDF | prezzo legacy | **migrata** al motore |
| 2565-2570 | totali del PDF | prezzo legacy | **migrata** al motore |
| 2598-2602 | prezzo di riga nel PDF finale | prezzo legacy | **migrata** al motore |

Le prime due meritano una nota: una calcola il **margine** (sul ricavo),
l'altra il **ricarico** (sul costo), ed entrambe finiscono a schermo con lo
stesso simbolo di percentuale. È la stessa confusione che faceva credere di
guadagnare il 40% guadagnandone il 28,6, un piano più in basso.

---

## Cosa resta da fare, e perché non è stato fatto ora

Items **non è ancora** un `ItemService → ItemCostAdapter → CostEngine`, e la
ragione è che il passo intermedio non esiste: senza una distinta base (quali
materiali, quanto tempo macchina, quale lavorazione) non c'è niente da dare al
motore. Costruirla è il lavoro della fase successiva, e va fatta insieme al
Product Builder, che quella distinta la conosce già.

Quello che è stato fatto ora è togliere dal file la matematica che non gli
apparteneva. Il resto — `InventoryCostResolver`, `UnitCostResolver`, il costo
medio e l'ultimo costo — richiede prima di decidere **da dove arriva il costo
di un articolo**, ed è una decisione di dominio, non di codice.

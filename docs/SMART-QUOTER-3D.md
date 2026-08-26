# SMART QUOTER 3D — il costo vero di una stampa

> Il calcolatore precedente sommava quattro voci. Sono le quattro che si
> vedono. Il conto di fine mese non torna per le altre.

---

## 1. Perché serviva rifarlo

`Print3DQuoter` calcolava: materiale, energia, ammortamento, manodopera. Un
laboratorio che usa quel numero lavora **al di sotto** del proprio prezzo, e non
capisce perché.

Cosa mancava, e quanto pesa:

| Voce | Perché conta |
|---|---|
| **Stampe fallite** | 5–10 % su FDM, di più su resina. Quel materiale e quelle ore sono già spesi |
| **Supporti** | Finiscono nel cestino, si pagano al chilo come il pezzo |
| **Manutenzione** | Ugelli, piatti, cinghie, film FEP, alcool, guanti: si consumano a ore, non con l'età della macchina |
| **Post-processo** | Lavaggio e polimerizzazione: una stampa in resina non è finita quando la stampante si ferma |
| **Ciclo di lavoro** | Una stampante da 350 W non ne assorbe 350 di continuo |
| **Valore residuo** | Una macchina a fine vita si rivende: si ammortizza la differenza |
| **Packaging** | Scatola, pluriball, etichetta: si pagano per pezzo |

E un errore di struttura: il **setup era conteggiato per pezzo**. Preparare file
e macchina costa uguale che si stampi un pezzo o venti; non dividerlo per la
quantità rende il prezzo su dieci pezzi fuori mercato.

---

## 2. Le formule

Tutte in `src/product/print3d-cost.js`, funzione pura `InglyPrint3D.cost()`.

```
materiale      = (grammi + supporti) / 1000 × €/kg
                 grammi ricavabili dal volume dello slicer × densità

energia        = (potenza_W / 1000) × ore × €/kWh × ciclo_di_lavoro

ammortamento   = (prezzo_macchina − valore_residuo) / vita_ore × ore

manutenzione   = €/ora × ore

post-processo  = (min_lavaggio_cura / 60) × €/ora + consumabili

manodopera     = (setup_min / 60 × €/ora) / quantità        ← una volta per lavoro
               + (finitura_min / 60 × €/ora)                ← una volta per pezzo

packaging      = € per pezzo

scarto         = (materiale + energia + ammortamento + manutenzione)
                 × tasso / (1 − tasso)
                 ── solo su ciò che si perde davvero: la finitura non è
                    ancora stata fatta quando la stampa fallisce
```

### Il margine non è il ricarico

```
prezzo = costo / (1 − margine)          ✅
prezzo = costo × (1 + margine)          ❌
```

Un margine del 40 % su un costo di 1,00 € dà **1,67 €**, non 1,40 €. Chi usa la
seconda formula crede di guadagnare il 40 % e guadagna il **28,6 %**.

L'interfaccia lo scrive esplicitamente sotto il totale:
«con margine del 40% il prezzo sarebbe 17,04 € — un ricarico ×1,67, non ×1,40».

---

## 3. Le quattro strategie

Ognuna sviluppa costo, netto, IVA, lordo, profitto, margine e markup — e i
totali sul lotto:

| Strategia | Margine di default |
|---|---:|
| Competitivo | 25 % |
| Standard | 40 % |
| Premium | 55 % |
| Luxury | 70 % |

Sul lotto si moltiplicano **netto e profitto**, non il costo unitario: quello è
già per pezzo, e il setup è già stato diviso.

---

## 4. Perché è una funzione pura

`LaserCalcV2`, `CalcMacchine` e il vecchio `Print3DQuoter` leggevano i valori
dagli `id` dei campi nel DOM. Conseguenze: non si potevano invocare da codice,
non si potevano provare senza aprire una finestra, e il Product Builder non
poteva usarli — era un limite noto documentato in `docs/PHASE-2.md`.

Ora il calcolo non sa che esiste una pagina. La patch 108 legge i campi e
disegna il risultato; non calcola più. Due mestieri separati, che prima erano
lo stesso.

```js
const r = InglyPrint3D.cost({ grams: 120, supportGrams: 20, hours: 6, qty: 4, … });
r.costo            // costo pieno per pezzo
r.voci             // il dettaglio, voce per voce, con la spiegazione
r.strategie        // i quattro posizionamenti già sviluppati
r.prezzoDaMargine(40)
r.margineDi(17.04)
```

---

## 5. I casi limite, presidiati

30 test in `tests/print3d-cost.test.mjs`. Quelli che contano davvero:

- **quantità 0, negativa o non numerica** → vale 1, non divide per zero
- **valori negativi** → azzerati, non propagati. Un prezzo negativo non genera
  uno sconto, e due segni meno non si moltiplicano in un costo positivo falso
- **margine oltre 95 %** → limitato, invece di dare infinito
- **ciclo di lavoro fuori scala** → riportato fra 0 e 1
- **ore 0** → azzerano energia, ammortamento e manutenzione, non il materiale
- **macchina o materiale mancanti** → il calcolo resta finito e positivo
- **valore residuo maggiore del prezzo** → ammortamento 0, non negativo

---

## 6. Cosa manca ancora

- **Import da G-code / 3MF / CSV** (Bambu, Orca, Prusa): non implementato.
  Non è stato simulato: preferibile un'assenza dichiarata a un dato inventato.
- **Modalità Quick / Pro**: i campi avanzati sono tutti presenti ma sempre
  visibili; la separazione in due modalità non è stata fatta.
- **Catalogo macchine e materiali** condiviso con il resto del prodotto: oggi
  il quoter ha le proprie liste, non ancora unificate con `equipment` e `items`.
- **Riferimento**: `stimalo.com` non è raggiungibile dal proxy di rete di questo
  ambiente. Il modello adottato è quello standard del settore, non una copia
  verificata di quel calcolatore.

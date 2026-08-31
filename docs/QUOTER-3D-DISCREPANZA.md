# Smart Quoter 3D — le tre catene, trovate

Riproduzione misurata nel browser prima di toccare il codice, come richiesto
dal punto 1 della direttiva.

---

## 0. La risposta breve

**Non esistono tre matematiche.** Ne esiste **una sola**, applicata a **tre
stati diversi degli ingressi** in tre momenti diversi.

| Valore | Da dove viene | Formula |
| ------ | ------------- | ------- |
| € 14,60 | `LINES[i].cpz` — costo **congelato** quando la riga è stata aggiunta, con peso 290 g | la formula canonica |
| € 7,17 | breakdown **live**, ricalcolato adesso con peso **2 g** | la stessa formula canonica |
| € 51,09 | `14,60 ÷ (1 − 0,7143)` = 14,60 × 3,4993 | la stessa funzione di prezzo |

Il difetto non è aritmetico. È che **il peso è cambiato da 290 g a 2 g senza
che niente lo dicesse**, e che la schermata mostra fianco a fianco un numero
congelato e uno vivo senza distinguerli.

---

## 1. La riproduzione

Con i parametri che riproducono i numeri riportati — 9h57, €24/kg, 256 W,
ciclo 0,6, €0,28/kWh, macchina €299 su 2000 h, manutenzione €0,12/h, scarto
7%, manodopera €15/h, avviamento 15 min:

```
  caso                                    peso al motore   campo a schermo   costo
  A · campo 290, slicer vuoto                    290 g            290        € 14,58
  C · slicer «peso totale» = 2                     2 g            290        €  7,15
```

I due numeri riportati dall'utente — **€ 14,60** e **€ 7,17** — sono questi
due, al centesimo di differenza dovuto ai suoi valori esatti.

La composizione del € 7,17 torna voce per voce:

```
  materiale        0,048     2 g × € 24,00/kg
  energia          0,430     256 W × 0,6 × 9,95 h × € 0,28
  ammortamento     1,500     € 299 ÷ 2000 h × 9,95 h
  manutenzione     1,200     € 0,12/h × 9,95 h
  scarto           0,240     perdibile × 0,07 ÷ 0,93
  avviamento       3,750     15 min × € 15/h
  ─────────────────────
                   7,168
```

Ed è **la stessa identica formula** che con 290 g dà € 14,60.

---

## 2. Causa A — la card slicer sovrascrive il campo peso, in silenzio

`pesi()` in patch 108:

```js
function pesi(){
  if(SLICER.pesoTotale>0){          // ← se la card è compilata, il campo non conta più
    if(SLICER.includeTutto){
      var modello = SLICER.pesoModello>0 ? SLICER.pesoModello
        : Math.max(0, SLICER.pesoTotale - SLICER.supporti - SLICER.purge);
      return { modello:modello, … };
    }
    …
  }
  return { modello:gv('p3d-g',0), … };   // ← altrimenti il campo
}
```

Basta un numero nella card «Importa dallo slicer» perché il campo «🧵
MATERIALE (g)» smetta di comandare. **Il campo continua a mostrare 290** — è
misurato: `campoDOM: "290"` mentre `gramsMotore: 2`.

Due modi di arrivarci, entrambi riprodotti:

| | |
| --- | --- |
| **C** | si scrive un peso nella card e si dimentica il campo sotto: comanda la card |
| **B / D** | si compila «peso totale» e anche «supporti» con la spunta «il totale comprende già i supporti»: `290 − 288 = 2` |

Il caso B è il più insidioso: la sottrazione è **giusta** — è l'anti-doppio
conteggio della Fase 3 che funziona — ma se «supporti» viene compilato con il
peso del modello invece che con quello dei supporti, il risultato è 2 g e
nessuno lo segnala.

**Manca un guardiano**: un peso modello che scende sotto una frazione
ragionevole del totale è quasi sempre un errore di compilazione, non un
pezzo fatto di supporti.

---

## 3. Causa B — «Costo Vivo» è congelato, «DETTAGLIO COSTI» è vivo

Sono due domande diverse presentate come una sola:

| | risponde a | quando |
| --- | --- | --- |
| **Costo Vivo** (totali) | quanto costano le righe che ho **messo nel preventivo** | congelato al momento dell'aggiunta |
| **DETTAGLIO COSTI — live** | quanto costa quello che sto **configurando adesso** | ricalcolato a ogni tasto |

Entrambi corretti. Ma se dopo aver aggiunto la riga si cambia un ingresso —
o lo cambia la card slicer senza dirlo — i due numeri divergono, e niente
sulla schermata spiega perché.

Il congelamento **è voluto** ed è la regola dello storico economico: una riga
messa a preventivo non deve cambiare sotto i piedi. Il difetto è che non è
dichiarato.

---

## 4. Causa C — € 51,09 non è un terzo percorso

```
  51,09 ÷ 14,60 = 3,4993   →   margine 71,43%
```

È il margine predefinito, quello equivalente al vecchio moltiplicatore ×3,5
conservato nella Fase 3 perché nessun prezzo si muovesse. La formula è
`costo ÷ (1 − margine)`, la stessa di tutto il resto.

Il «prezzo consigliato € 7,54» del pannello viene dallo stesso motore sul
costo live di € 7,17 con un margine basso — è coerente con il proprio costo,
non con quello della riga.

---

## 5. Le funzioni, con ingresso e uscita

| Funzione | Ingresso | Formula | Uscita |
| -------- | -------- | ------- | ------ |
| `Print3DQuoter.ingresso()` | campi DOM + `SLICER` | `pesi()`, `energiaScelta()` | oggetto per il motore |
| `pesi()` | `SLICER` **oppure** `p3d-g` | totale − supporti − purge, o campo | grammi |
| `InglyQuoter3DView.calcola()` | ingresso | delega | risultato |
| `InglyCostEngine.calcola()` | ingresso | **la formula canonica** | `costoPezzo` |
| `InglyCostEngine.prezzo()` | costo, margine | `costo ÷ (1 − m)` | netto |
| `Print3DQuoter.addLine()` | `COST`, `PRICE` | copia | riga **congelata** |
| `Print3DQuoter.totali()` | `LINES` | somma | Costo Vivo, netto, IVA, lordo |

Una sola formula di costo. Una sola formula di prezzo. Tre momenti.

---

## 6. Cosa va corretto

1. **Una sola fonte dichiarata per il peso.** `filamentWeightSource` con i tre
   valori della direttiva, e la UI dice quale comanda invece di mostrarne due.
2. **Un guardiano sul peso modello.** Se scende sotto il 20% del totale, si
   avvisa: quasi sempre è «supporti» compilato con il peso sbagliato.
3. **Dichiarare il congelamento.** «Costo Vivo» deve dire che è il costo delle
   righe come erano quando sono state aggiunte, e segnalare quando la
   configurazione corrente non corrisponde più.
4. **Test di regressione** (punto 24): peso UI ≠ peso motore deve far fallire
   un test, non comparire in un preventivo.

Nessuna formula da eliminare: non ce n'è una di troppo.

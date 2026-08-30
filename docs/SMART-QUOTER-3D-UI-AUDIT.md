# La vista del preventivatore 3D — cosa faceva davvero

Misurato sul file consegnato, non dedotto.

---

## 1. Il difetto centrale: il prezzo lo calcolava la vista

```js
COST = total;
PRICES = { p1: total * m1, p2: total * m2, p3: total * m3 };   // 3.5 · 2.8 · 2.2
```

Tre **moltiplicatori** applicati dentro `calc()`, nel file che disegna.

Lo slider «margine» esisteva — `#p3d-margin`, da 10 a 80, predefinito 40 — ed
era usato in **due** punti, entrambi decorativi:

- riga 375: un testo che diceva «con margine del 40% il prezzo *sarebbe*…»;
- riga 389: un controllo che coloriamo di rosso se il margine ottenuto dai
  moltiplicatori non raggiungeva quello desiderato.

Non comandava niente. `addLine()` metteva nel preventivo `PRICES.p1`, cioè il
prezzo del moltiplicatore.

### Quanto costava, misurato

Su un costo di 18,68 € con margine chiesto del 40%:

| scaglione | moltiplicatore | prezzo | margine ottenuto |
| --------- | -------------- | -----: | ---------------: |
| SINGOLO | ×3,5 | 65,38 € | **71,4%** |
| SERIE | ×2,8 | 52,30 € | 64,3% |
| STOCK | ×2,2 | 41,10 € | 54,5% |
| *chiesto dall'utente* | — | *31,13 €* | *40,0%* |

**Il 110% in più di quanto l'utente avesse chiesto**, sul prezzo singolo. E
nulla lo diceva: il campo si chiamava «margine», il numero era un ricarico.

Questa è la seconda metà della risposta alla domanda originale «perché costa
troppo». La prima era il **livello di costo** (18,68 invece di 7,21); questa è
il **prezzo** (65,38 invece di 31,13). Insieme: 65,38 € contro 12,02 € — il
prezzo al 40% sul costo di stampa.

## 2. Cosa la vista faceva bene

`InglyPrint3D.cost()` era già un adapter del motore (Fase 28): il **costo** era
corretto e non duplicato. Verificato a schermo: 18,68 € a video contro 18,68 €
dal motore, allo stesso centesimo.

Il difetto era tutto nel **prezzo**.

## 3. Altri rilievi

| | |
| - | - |
| card duplicate | nessuna |
| pulsanti con più owner | nessuno |
| handler duplicati | nessuno |
| id duplicati nel documento | **0**, verificato a runtime |
| overlay o sovrapposizioni | nessuna |
| valori a schermo diversi dal motore | solo il prezzo (§1) |
| `prompt()` nativo in `addExtra` | **presente** — resta, fuori dal perimetro di questa fase |

## 4. La correzione

Il prezzo passa dal motore. I tre scaglioni conservano il proprio
posizionamento — singolo, serie, stock — ma come **margini**, non come
moltiplicatori:

```
×3,5  →  margine 71,4%
×2,8  →  margine 64,3%
×2,2  →  margine 54,5%
```

**Nessun numero si è mosso**: la conversione è esatta, e un controllo nel
browser lo verifica (`prezzo dal margine` = `costo × moltiplicatore`, a meno di
due centesimi). Cambia che ora il margine mostrato è quello vero, che
l'etichetta dice da quale campo viene, e che chiedere il 40% dà il 40%.

Se il motore manca, lo scaglione lo dichiara invece di mostrare un prezzo
indovinato.

## 5. Il nuovo modulo di vista

`src/product/quoter3d-view.js` — 308 righe, **nessuna moltiplicazione di
prezzo**, e un test lo impedisce per il futuro (`costo * n`, `* (1 +`,
`/ (1 -`, `markup` non compaiono).

Espone le sezioni della direttiva:

| sezione | cosa | stato |
| ------- | ---- | ----- |
| B · modalità | Hobby / Maker / Business = i tre livelli del motore | pronta |
| C · hero | costo di stampa · costo modalità · prezzo · profitto | pronta |
| D · dettaglio | ogni voce con quota % e **fonte** | pronta |
| E · strategie | quattro politiche, ognuna a margine obiettivo | pronta |
| F · quantità | scaglioni + tre evidenziazioni | pronta |
| G · calibrazione | confronto con lo slicer, spiegato | pronta |

Le sezioni sono **calcolate e provate** (44 test) ma **non ancora montate**
nella pagina del quoter: la patch 108 usa il motore per il prezzo, e questo
chiude il difetto, ma la nuova disposizione a schermo è il passo successivo.

## 6. Esito

| criterio | esito |
| -------- | ----- |
| audit misurato | **PASS** |
| il prezzo arriva dal motore | **PASS** — verificato a schermo |
| margine chiesto = margine ottenuto | **PASS** |
| nessun numero si è mosso senza ragione | **PASS** — conversione esatta |
| tre modalità di costo | **PASS** nel modulo |
| fonti dichiarate | **PASS** nel modulo |
| calibrazione | **PASS** nel modulo |
| zero duplicazioni UI | **PASS** — 0 id duplicati |
| zero errori JS | **PASS** |
| zero regressioni | **PASS** — 812 test |
| **sezioni montate nella pagina** | **PARTIAL** — calcolate e provate, non ancora disposte a schermo |

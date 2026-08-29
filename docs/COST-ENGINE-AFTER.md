# COST-ENGINE-AFTER — prima e dopo, misurato

Tutti i numeri vengono da `node scripts/audit-cost-engines.mjs`, sullo stesso
perimetro (184 file sorgente, librerie di terzi escluse).

---

## Il confronto

| Misura | Prima | Dopo | |
|---|---:|---:|---|
| File che usano il motore unico | **1** | **4** | il motore stesso, più tre quoter |
| File con matematica di prezzo propria | **59** | **55** | −4 |
| Formule di margine/ricarico a mano | 26 | **24** | |
| Sconti applicati al prezzo a mano | 39 | **37** | |
| IVA calcolata a mano | 47 | **46** | |
| Valori letti dal DOM per calcolare | 267 | **264** | |
| Moltiplicatori scritti nel codice | 235 | **179** | −56, escluse le librerie di terzi |
| Motori matematici attivi | **4** | **1** | gli altri tre sono adapter |
| Test unitari | 198 | **254** | +56 |

### Come leggere questi numeri

La riga che conta è la penultima: **da quattro motori a uno**. I file che
«hanno ancora la propria matematica» sono scesi solo di quattro, ma i tre che
sono passati sono i tre che producono i prezzi che il cliente vede.

Le altre righe si muovono poco di proposito. Sostituire 264 letture dal DOM con
una passata automatica si scrive in un pomeriggio ed è anche il modo migliore
per rompere un gestionale che qualcuno usa per lavorare. Scendono a mano,
modulo per modulo, con il cricchetto che impedisce loro di risalire.

---

## Cosa non esiste più

| | |
|---|---|
| Motori duplicati | `InglyPrint3D`, `PricingEngine`, `_calcV32` non calcolano più: traducono |
| Prezzi sotto costo | il pavimento di margine è nel motore, e nessuna strada lo aggira |
| Margine confuso con ricarico | due funzioni distinte, entrambe esposte, mai sommate |
| Costanti commerciali sepolte | prezzo minimo, express e quota rivenditore hanno un nome |
| Sconto globale non protetto | passa dal motore come tutti gli altri |
| Prezzi inventati senza motore | chi non trova `InglyCostEngine` dichiara l'indisponibilità |

---

## Cosa presidia il risultato

`tests/architecture-cost-engine.test.mjs` — 21 controlli sul **file
consegnato**, non sui sorgenti:

- il motore esiste e i cinque profili ci sono;
- non è comparso un secondo motore con un altro nome (`CostEngineV2`,
  `LaserCostEngine`, …);
- ognuno dei quattro consumatori chiama `InglyCostEngine`;
- nessuno di loro ha più formule di margine, ricarico, sconto o IVA a mano;
- nel bundle il motore è composto **prima** di chi lo usa — è una dipendenza
  reale, non una convenzione;
- il motore resta puro anche nel file consegnato: nessun `Math.random`, nessun
  `new Date`, nessun `localStorage`, nessun accesso al DOM;
- le politiche di prezzo del laser non sono più sepolte nella formula;
- **il cricchetto**: i file con matematica propria non possono superare 55.

`tests/cost-engine.test.mjs` — 87 controlli sulla matematica, fra cui:

- immutabilità: il motore non tocca l'input, e un risultato già calcolato non
  cambia se l'input cambia dopo;
- determinismo: cento chiamate identiche, cento risultati identici, e il
  sorgente non contiene sorgenti di casualità;
- invarianti su una griglia di 6 profili × 10 quantità × 8 tassi di scarto:
  costo mai negativo, mai NaN, mai infinito; il costo unitario non risale al
  crescere della quantità; più scarto, macchina più cara o manodopera più cara
  non possono mai costare **meno**;
- il pavimento regge su tutte le 128 combinazioni di strategia, sconto e
  quantità.

---

## Il difetto che non può più tornare

Il motivo per cui questo lavoro è stato fatto, in una riga misurata:

```
Prima: 200 pezzi, margine impostato 40%  →  margine reale −5,0%
Dopo : 200 pezzi, margine impostato 40%  →  margine reale 11,8%
```

Un test prova tutte le combinazioni di sconto e quantità, non una scelta bene.

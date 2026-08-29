# Fase 33 — un motore solo, anche dove si usa davvero

---

## 1. Il difetto: una migrazione fatta sul gemello sbagliato

La Fase 28 aveva migrato `LaserB2B._calcV32` al motore unico, e la migrazione
era corretta.

Misurato nel file consegnato:

```
vista aperta          view-laser_b2b
interfaccia disegnata quella della patch 078   (#lb2b-machine presente)
comandi che chiamano  LaserB2B.calc      23
comandi che chiamano  LaserB2B._calcV32   7
LaserB2B.calc passa dal motore?          NO
```

`_calcV32` è il calcolatore di **un'altra interfaccia**. Quella che l'utente
apre chiama `LaserB2B.calc`, che il motore non lo vedeva nemmeno.

È il difetto ricorrente del progetto in una forma nuova: non due sistemi che si
contendono un concetto, ma **un PASS dichiarato su una funzione che nessuno
chiama**. Il presidio della Fase 28 guardava il sorgente del file giusto e
trovava quello che cercava.

## 2. Perché un rilevatore testuale non bastava

`LaserB2B.calc`, nella catena di patch, finisce avvolto:

```js
var _origCalc = LaserB2B.calc.bind(LaserB2B);
LaserB2B.calc = function(){ _origCalc(); drawAdminPanel(); };
```

L'involucro non nomina il motore. Un controllo che legge le stringhe avrebbe
detto «non migrato» su una funzione migrata — e infatti la prima versione del
mio rilevatore l'ha detto.

`tests/qa/laser-b2b.mjs` misura **quello che finisce a schermo**: disegna la
tabella dei prezzi e confronta ogni numero con quello che il motore produce
dagli stessi ingressi. 6 costi su 6 e 6 prezzi su 6.

## 3. Il secondo difetto, trovato mentre si misurava

La tabella mostrava **prezzi senza la quantità a cui si riferiscono**.

```js
'<td style="…">' + sd2 > 0 ? '-'+Math.round(sd2*100)+'%' : '—' + '</td>'
```

La concatenazione lega più stretta del confronto: si valutava
`('<td…>' + sd2) > 0`, cioè `false`, e il ternario restituiva sempre il ramo
negativo — `'—</td>'`, senza il tag di apertura. Il browser, chiudendo un `<td>`
mai aperto, si mangiava anche la colonna della quantità.

Misurato prima della correzione: `["€1.13", "€15.00", "92%", "€75", "€69"]` —
cinque celle invece di sette, e nessuna dice se sono 5 o 200 pezzi.

Due parentesi.

## 4. La migrazione non sposta un centesimo

54 casi — sei scaglioni di quantità × tre materiali × i tre ricarichi di canale
(2,0 · 3,0 · 3,5). Costo e prezzo identici fino alla nona cifra.

**Una sola differenza, ed è voluta.** Il pavimento di margine del 15% ora
interviene sotto un ricarico di **1,17647** (`m ≥ 1/0,85`):

| ricarico | margine | prima | dopo |
| -------- | ------- | ----- | ---- |
| 1,20 | 16,7% | 103,59 € | 103,59 € |
| 1,15 | 13,0% | 103,59 € | **105,97 €** |

Sotto la soglia si vendeva sotto il margine minimo che il laboratorio si è
dato, senza alcun avviso. Con i tre ricarichi predefiniti il pavimento non
scatta mai: chi non tocca le impostazioni non vede alcuna differenza.

## 5. I due residui della Fase 32, chiusi

**(a) Un costo mancante non vale più zero euro.**
`+p.costPrice || +p.cost || 0` faceva dichiarare a una scheda prodotto il 100%
di margine su un costo che nessuno aveva inserito. Ora è `null` — «non lo so» —
e la scheda mostra «No costo inserito», che era già previsto e non si vedeva
mai perché lo zero arrivava prima.

**(b) La soglia del 45% ha un nome.**
`costPrice / (1 - 0.45)`, scritta in due punti del codice che disegna, è
diventata `Catalog.POLITICHE.margineConsigliatoPct` e il prezzo lo calcola il
motore.

**Il numero non cambia.** Si è scelto di *non* usare la politica «premium» del
motore, che punta al 55%: avrebbe alzato ogni prezzo consigliato del 22% senza
che nessuno lo avesse chiesto. Rinominare una decisione non è prenderne
un'altra. Verificato su cinque costi: identico fino alla nona cifra.

## 6. Cosa resta fuori dal motore, e perché

| | file | verdetto |
| - | ---- | -------- |
| `_calcV32` e i suoi gemelli nelle patch 086, 094, 075 | tre copie del calcolatore laser | **codice morto vivo**: definite ma non raggiunte dalla vista. Vanno ritirate, non migrate — migrarle sarebbe rifare l'errore della Fase 28 |
| 11 file in categoria D | patch storiche | prezzo legacy in schermate che non sono nel percorso principale |
| 8 file in categoria E | scaglioni e minimi | politiche da estrarre, come si è fatto qui |

I contatori non scendono in questa fase perché il classificatore lavora **per
file** e le patch toccate contengono anche altro. Il numero che è sceso è
quello che conta: le formule di prezzo sul percorso che l'utente attraversa.

## 7. Esito

| criterio | esito |
| -------- | ----- |
| il calcolatore in uso passa dal motore | **PASS** — 6/6 costi, 6/6 prezzi, misurati a schermo |
| nessun prezzo cambia senza ragione | **PASS** — 54 casi identici |
| le differenze sono dichiarate | **PASS** — solo il pavimento, sotto ricarico 1,176 |
| politiche con un nome | **PASS** — prezzo minimo, scaglioni, margine consigliato |
| nessun motore nuovo | **PASS** — cricchetto verde |
| zero regressioni | **PASS** — 687 test |
| zero errori JS | **PASS** |

**FASE 33 = CLOSED**, con il rischio residuo del §6: tre copie del calcolatore
laser restano nel file consegnato senza essere raggiungibili. Non fanno danno
finché nessuna patch futura le richiama, ed è esattamente il modo in cui questo
progetto ha già trovato quattro motori di prezzo.

# Il costo dopo il resolver

Fase 32. Misure sul file consegnato.

---

## 1. Cosa è cambiato

| | prima | dopo |
| - | ----- | ---- |
| costo di un materiale | `costPrice`, digitato una volta, mai aggiornato | media ponderata / ultimo / FIFO sugli acquisti veri |
| riga di preventivo | una descrizione con un costo digitato | porta `itemKey` (`store:id`) |
| «da dove arriva questo costo» | nessuna risposta | acquisto, data, fornitore, documento |
| costo mancante | `+p.costPrice \|\| 0` → margine del 100% | `null` + motivo |
| copertura parziale | non esisteva il concetto | dichiarata: coperta / scoperta / completa |
| costo negli ordini storici | il costo del preventivo, e basta | anche il costo pagato, congelato con la provenienza |

## 2. File

**Creati**

| file | cosa |
| ---- | ---- |
| `src/product/inventory-cost-resolver.js` | 330 righe · il resolver, puro |
| `tests/inventory-cost-resolver.test.mjs` | 50 test |
| `tests/qa/costo-reale.mjs` | 22 controlli nel browser |
| `docs/INVENTORY-COST-RESOLVER-{AUDIT,DESIGN,AFTER}.md` | |

**Modificati**

| file | cosa |
| ---- | ---- |
| `mod:quoter/index.js` | identità della riga, badge del costo reale, congelamento al salvataggio |
| `src/product/quote-adapter.js` | `itemKey` attraversa il calcolo |
| `src/product/order-snapshot.js` | `itemSnapshot.itemKey` e `costSnapshot` per riga |
| `src/product/inventory-view.js` | badge del costo e finestra della provenienza |
| `scripts/audit-historical-pricing.mjs` | due cricchetti nuovi |
| `src/product/index.mjs`, `package.json`, `baseline/deliberate-changes.json` | |

## 3. Test

| | prima | dopo |
| - | ----- | ---- |
| unitari | 625 | **675** |
| QA nel browser | 5 suite | **6 suite** |
| falliti | 0 | **0** |

**Golden della specifica** — tutti verdi:

| caso | atteso | misurato |
| ---- | ------ | -------- |
| A · 100 @ 1 | last 1 · avg 1 · fifo 1 | ✔ |
| B · +50 @ 2 | last 2 · avg 1,333… · fifo 1 | ✔ |
| C · consumo 120 | 100@1 + 20@2 = **140 €** | ✔ |
| storico · listino 1,20 → 1,70 | **1,20** | ✔ |

**Negativi** — tutti producono un risultato esplicito, mai uno zero: articolo
inesistente, movimenti senza costo, riga non collegata, registro non caricato,
politica inventata, FIFO parzialmente coperto, lotti senza costo.

**Prestazioni** — misurate, non ipotizzate:

| movimenti | ultimo | media | FIFO |
| --------- | ------ | ----- | ---- |
| 100 | 0 ms | 1 ms | 1 ms |
| 1.000 | 1 ms | 3 ms | 2 ms |
| 10.000 | 14 ms | 26 ms | 16 ms |
| 100.000 | 157 ms | 283 ms | 207 ms |

## 4. Difetti trovati durante la fase

| | dove | esito |
| - | ---- | ----- |
| l'identità dell'articolo esisteva nell'option e si perdeva alla riga | `mod:quoter` `addLine` | **corretto** |
| `_selectRPItem` riceveva tre pezzi interpolati nell'onclick, e l'identità non era fra i tre | `mod:quoter` | **corretto** |
| `+p.costPrice \|\| +p.cost \|\| 0` — un costo mancante diventa zero euro | `mod:catalog:1253` | **trovato, non corretto** (§6a) |
| `costPrice / (1 − 0.45)` — soglia commerciale scritta nel codice | `mod:catalog:817, 2294` | **trovato, non corretto** (§6b) |
| due miei conti a mano sbagliati nei test (200/150 invece di 220/150) | `tests/` | corretti |
| `assert.deepEqual` fallisce fra realm `vm` diversi | `tests/` | corretti |

## 5. Criteri della Fase 32W

| criterio | esito | prova |
| -------- | ----- | ----- |
| audit completo | **PASS** | `INVENTORY-COST-RESOLVER-AUDIT.md`, 10 branch mappati |
| OrderLine → Item linkage | **PASS** | `itemKey` fino a `itemSnapshot`, verificato nel browser |
| Last Cost | **PASS** | golden A, B |
| Weighted Average | **PASS** | golden A, B — 1,333… |
| FIFO | **PASS** | golden C — 140 € |
| correttezza storica | **PASS** | listino 1,20 → 1,70, resolver fermo a 1,20 |
| lineage | **PASS** | acquisto, data, fornitore, documento |
| compatibilità snapshot | **PASS** | `costSnapshot` congelato, immutabile |
| integrazione `InglyCostEngine` | **PASS** | il motore non è stato toccato: riceve costi, non li cerca |
| compatibilità 3D / Laser B2B / Product Builder | **PASS** | invariati: 675 test verdi, formule intatte |
| fallback sicuri | **PASS** | 5 motivi, `costo: null`, mai zero |
| performance | **PASS** | fino a 100.000 movimenti |
| golden tests | **PASS** | A, B, C + storico |
| negative tests | **PASS** | 7 scenari |
| architecture ratchet | **PASS** | motori paralleli 0, ripieghi nel resolver 0; entrambi rossi al controllo negativo |
| UI QA | **PASS** | badge con costo, metodo e data; nessun id tecnico a schermo |
| 0 errori JS | **PASS** | QA completa |
| 0 regressioni | **PASS** | 675/675 |

**FASE 32 = CLOSED.**

## 6. Rischi residui, dichiarati

**(a) `+p.costPrice || +p.cost || 0` nel catalogo.** Un costo mancante diventa
zero euro e il margine risulta del 100%. È fuori dal perimetro di questa fase —
tocca la vista catalogo, non il costo di magazzino — ma è la stessa classe di
difetto e va chiuso. Il cricchetto lo vieta nel resolver, non ancora altrove.

**(b) La soglia del 45% scritta nel codice** (`costPrice / (1 − 0.45)`): una
politica commerciale travestita da formula, come le tre già estratte nella
Fase 28. Va dichiarata come politica.

**(c) Smart Quoter 3D e Laser B2B non usano ancora il resolver.** Prendono il
costo materiale dai propri campi (`materialPricePerKg`, `sheetPrice`). Il
resolver è pronto e il collegamento è un lavoro di interfaccia — scegliere il
materiale dal magazzino invece di digitarne il prezzo — non di architettura.
Nessuna formula va toccata: cambia solo da dove arriva un numero.

**(d) Il consumo automatico da ordine ancora non avviene.** Il collegamento
riga → articolo ora esiste, quindi il pezzo mancante è solo la scrittura del
movimento alla conferma dell'ordine. Non è stato fatto qui perché consumare
magazzino automaticamente è una decisione operativa: va acceso da chi lo usa,
non subito e per tutti.

**(e) Il resolver non è ancora chiamato dal Product Builder.** Stessa natura
del punto (c).

## 7. Prossimo modulo

**Fase 33 — consolidamento del Cost Engine**, con dentro (a) e (b), che sono
esattamente residui di prezzo fuori dal motore.

Poi **34–37**, dove (c) ed (e) si chiudono da soli: collegare i quoter al
magazzino è, per ognuno, la stessa modifica di interfaccia.

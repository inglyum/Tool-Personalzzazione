# Smart Quoter 3D — Mount Audit

Stato al commit `89f8bf3`. Scritto **prima** di toccare il codice, perché la
domanda «dove monto la nuova vista» ha una risposta sbagliata ovvia — *in fondo
alla pagina* — e questo progetto ha già quattro motori di prezzo perché la
risposta ovvia è stata data quattro volte.

Ogni numero qui sotto è letto dal sorgente, con file e riga. Dove ho misurato,
c'è il valore misurato. Dove non ho misurato, lo dico.

---

## 0. Riassunto in una riga

La nuova vista non ha un posto vuoto dove entrare: deve **prendere il posto** di
tre blocchi della vecchia (dettaglio costi, scaglioni di prezzo, slider
margine), e nel farlo attraversa quattro difetti già presenti che non sono suoi
ma che si porta dietro se li ignora.

---

## 1. Dove disegna il vecchio quoter

Un solo punto, e non è un componente: è una stringa.

| Cosa | Dove |
| ---- | ---- |
| Modulo | `src/legacy/patches/108-var-print3dquoter-function.js` (567 righe, IIFE `var Print3DQuoter`) |
| Nodo di montaggio | `#view-print3d` |
| Disegno | `render()` — riga 79 → 289; **`root.innerHTML = …`** alla riga 146, una sola assegnazione lunga 143 righe |
| Ridisegno parziale | `calc()` — riga 334; scrive `#p3d-bk` (riga 394/396) e `#p3d-tiers` (riga 407/410) |
| CSS | `src/legacy/styles/107-view-print3d-overflow-y-auto.css`, ~50 regole tutte prefissate `#view-print3d .p3-*` |

`render()` è chiamato da quattro posti diversi:

- `src/legacy/app/src/core/app.js:344` — router legacy
- `src/legacy/patches/111-fase-1-navigation-bus.js:108` — navigation bus (Fase 1)
- `src/legacy/patches/075-…:864` — un terzo router, superstite
- `src/legacy/patches/109-function.js:255` — dopo l'import materiali

Tre router che chiamano lo stesso `render()`. Non è un bug (l'ultimo vince e il
risultato è identico), ma è la ragione per cui **la nuova vista non può tenere
stato nel DOM**: viene cancellata senza preavviso da chiunque navighi.

### Layout attuale

`.p3-grid` a tre colonne fisse — `330px 1fr 295px` (CSS riga 5):

| Col | Card | id/ancoraggio |
| --- | ---- | ------------- |
| 1 | Configura stampa · Materiale · Dettagli stampa · Macchine rapide | `p3d-watt`, `p3d-mat`, `p3d-g`, `p3d-h`, … |
| 2 | Voci in preventivo · **Dettaglio costi live** | `#p3d-bk` |
| 3 | **Prezzi di vendita** · IVA & Sconto · Azioni · Cliente · Salvati | `#p3d-tiers`, `#p3d-margin` |

---

## 2. Dove deve montare la nuova vista

`src/product/quoter3d-view.js` espone `InglyQuoter3DView` con **cinque
generatori di HTML** e un calcolatore. Nessuno di essi tocca il DOM: restituiscono
stringhe. La decisione di dove metterle è interamente di chi monta.

| Sezione | Funzione | Sostituisce | Destinazione |
| ------- | -------- | ----------- | ------------ |
| B — hero (costo/prezzo/margine/profitto) | `hero(r)` | *niente: non esiste oggi* | Col 2, in testa |
| C — dettaglio voci con fonte | `dettaglio(r)` | `#p3d-bk` (righe 396-405) | Col 2, dentro `#p3d-bk` |
| D — quattro politiche | `strategie(r)` | i tre scaglioni × moltiplicatore (righe 410-434) | Col 3, dentro `#p3d-tiers` |
| E — scaglioni di quantità | `quantita(r)` | *niente* | Col 2, sotto il dettaglio |
| F — calibrazione | `calibrazione(k)` | *niente* | Col 2, in coda, a richiesta |
| G — modalità Hobby/Maker/Business | `MODALITA` | *niente* | Col 3, **sopra** i prezzi |
| H — avvisi | dentro `r.avvisi` | l'unico avviso su `p3d-margin` | dentro l'hero |

**Conclusione di montaggio:** le sezioni C e D hanno un contenitore che già
esiste e già viene riscritto a ogni `calc()`. B, E, F, G, H no: servono
contenitori nuovi, creati da `render()`, riempiti da `calc()`. Il confine tra le
due funzioni non cambia.

---

## 3. La catena: OLD UI → NEW VIEW → ENGINE → QUOTE → ORDER

```
  #view-print3d  (input DOM: p3d-g, p3d-h, p3d-watt, …)
        │
        │  gv(id, default)      ← 108:68, lettura non tipizzata con fallback
        ▼
  ╔═══════════════════════════════════════════════════════════════╗
  ║  DUE PORTE PER LO STESSO MOTORE                               ║
  ╠═══════════════════════════════════════════════════════════════╣
  ║  vecchia:  InglyPrint3D.cost(i)     print3d-cost.js:78        ║
  ║               └─ motore.calcola({tecnologia:'print3d', …i})   ║
  ║  nuova:    InglyQuoter3DView.calcola(i, o)  quoter3d-view:162 ║
  ║               └─ E.calcola({…i, livelloCosto})                ║
  ╚═══════════════════════════════════════════════════════════════╝
        │                                    │
        │  stesso oggetto di ingresso — verificato: l'adapter passa
        │  i nomi invariati (print3d-cost.js:92-105) e il motore
        │  usa `i.tecnologia || 'print3d'` come default (cost-engine:432)
        ▼
  InglyCostEngine.calcola() / .prezzo() / .scaglioni()   ← unico motore, v1.2.0
        │
        ▼
  COST (numero)  +  PRICES {p1,p2,p3}     108:334-386
        │
        ▼
  LINES.push({id, n, qty, cpz:COST, ppz:PRICES.p1, t})   108:441
        │
        ├──► localStorage 'p3dq_v4'  (SAVED)             108:58
        ├──► doPdf()  → finestra nuova, rifà i totali    108:464
        ├──► doWa()   → testo, rifà i totali             108:492
        └──► sendQ()  → Quoter.addLine({desc,qty,price}) 108:509  ✗ ROTTO
                          │
                          ▼
                    Quoter  →  Order  →  OrderSnapshot
```

**La catena si interrompe a `sendQ()`.** Vedi §5.1.

---

## 4. Quale valore diventa `unitPrice`, quale valore si vede

Le due colonne non coincidono, ed è il primo problema da risolvere nel montaggio.

| | Mostrato a schermo | Scritto nella riga |
| --- | --- | --- |
| Costo | `total` = `R.costo`, livello **`completo`** (default motore) | `cpz: COST` — stesso numero ✓ |
| Prezzo | `pFinal` = prezzo × (1−sconto) × (IVA?1.22:1) — 108:426 | `ppz: PRICES.p1` — **netto, senza sconto, senza IVA** |
| Scaglione | tre righe: singolo / serie / stock | **sempre `p1`**, cioè sempre la fascia 1–5 pz |

Tre disallineamenti misurabili:

1. **Il prezzo mostrato non è il prezzo salvato.** Con IVA attiva (default:
   `IVA_ON=true`, riga 55) e sconto 0, lo schermo dice `€ X · 1,22` e la riga
   registra `X`. Il totale in fondo (riga 121-124) riapplica IVA e sconto su
   `ppz`, quindi il totale finale è corretto — ma il numero grande accanto allo
   scaglione e il numero nella colonna «Prezzo/pz» della tabella **differiscono
   del 22%**, sulla stessa schermata, senza che nulla lo spieghi.
2. **La quantità non sceglie lo scaglione.** `addLine()` prende `PRICES.p1`
   qualunque sia `p3d-qty`. Chi configura 50 pezzi vede lo scaglione STOCK
   evidenziato e ottiene una riga al prezzo SINGOLO. Gli scaglioni sono
   decorativi.
3. **`editLine()` (108:445) sovrascrive `ppz` da un `prompt()`** senza
   registrare che è un override manuale. La riga risultante non è distinguibile
   da una calcolata: il margine medio (riga 118) la include come se fosse
   motivata.

**Decisione per il montaggio:** la nuova vista mostra il netto e dichiara IVA e
sconto come righe separate. `unitPrice` = netto. È l'unica scelta che rende le
due colonne la stessa colonna.

---

## 5. Difetti trovati durante l'audit (non introdotti dal montaggio)

### 5.1 `sendQ()` chiama una funzione con la firma sbagliata — la catena verso il preventivo non esiste

```js
// 108:509
if(typeof Quoter!=='undefined' && typeof Quoter.addLine==='function'){
  LINES.forEach(function(l){ Quoter.addLine({desc:l.n, qty:l.qty, price:l.ppz}); });
  showToastP('✅ Inviato allo Smart Quoter ('+LINES.length+' voci)','success');
```

`Quoter.addLine` è dichiarata `async addLine(){ … }` — **zero parametri**
(`src/legacy/app/src/modules/quoter/index.js:791`). Legge i campi del form del
Quoter: `ql-cat`, `ql-resource`, `ql-unit-cost`. L'oggetto passato è ignorato.

Effetto misurabile: con il Quoter mai aperto, `eid('ql-cat')?.value` è vuoto →
`toast('Seleziona una categoria','warning')` → `return`. **Zero righe
aggiunte**, N toast di errore, e subito dopo un toast verde che dichiara il
successo. Il pulsante «→ Quoter» non ha mai funzionato.

La firma giusta esiste ed è accanto: `addLineFromCalc(d)` (riga 471), che accetta
`{name, category, unit, qty, unitCost, itemId, itemStore}` — cioè esattamente
quello che una riga 3D ha da dare, **costo incluso**. `addLine({price})` buttava
via il costo comunque: una riga senza `unitCost` arriva all'ordine senza
`costBreakdown`, e lo snapshot la classifica come priva di costo.

> Nota adiacente, fuori dallo scopo di questa fase: `addLineFromCalc` scrive
> `markup:1.4, price: unitCost*1.4` e `subtotal: unitCost*qty`. Il subtotale è
> calcolato sul **costo**, non sul prezzo. Da verificare se `recalcRight()` lo
> corregge prima che l'utente lo veda. Registrato, non toccato qui.

### 5.2 Patch 109 legge il prezzo dal DOM con un selettore morto

```js
// 109:211
var saleEl = document.querySelector(
  '#view-print3d .p3-tier .tier-price, #view-print3d .p3-tier div[style*="font-size:22px"]');
```

- `.tier-price` — **la classe non esiste in nessun file del repository**
  (verificato: unica occorrenza è questa riga).
- `font-size:22px` dentro `#view-print3d` — **non esiste**. L'unico `22px` nel
  patch 108 è nel CSS della finestra PDF (`.grand`), fuori dal documento. Il
  prezzo dello scaglione è disegnato a `font-size:20px` (108:424).

Quindi `salePrice` è sempre `0`. E `costPpz` legge `Print3DQuoter._state.cost`
(109:205) — **`_state` non è esportato**: il `return` del modulo (108:559-565)
elenca 25 metodi e nessuna proprietà `_state`. Sempre `0`.

**Il pulsante «→ Catalogo» salva prodotti con costo 0 e prezzo 0.** Ed è il tipo
di difetto che questo montaggio deve chiudere, non ereditare: un prezzo letto
per scraping di una dimensione di carattere è un accoppiamento che si rompe al
primo restyling — e infatti si è già rotto.

### 5.3 I pulsanti iniettati da 109 spariscono al primo ridisegno

```js
// 109:174
var root = document.getElementById('view-print3d');
if(!root || root._enhanced) return;
root._enhanced = true;
… parent.appendChild(btnDiv);   // «→ Catalogo» e «← Magazzino»
```

`render()` esegue `root.innerHTML = …` (108:146), che cancella i due pulsanti.
`root._enhanced` resta `true` sulla proprietà dell'elemento, che **non** viene
cancellata da `innerHTML`. Alla chiamata successiva la guardia esce subito.

Risultato: i due pulsanti esistono solo tra il primo `enhance3DQuoterActions()`
e il primo `render()` successivo — cioè, dato che ogni navigazione chiama
`render()`, **quasi mai**.

Questo è il difetto strutturale che il montaggio deve rispettare: *chiunque
appenda al DOM del quoter viene cancellato*. La nuova vista non può essere
appesa. Deve essere generata da `render()`.

### 5.4 L'IVA 22% è scritta a mano in quattro punti

`108:120` (totali), `108:427` (scaglioni), `108:473` (PDF), `108:497`
(WhatsApp). Quattro `0.22` e quattro `1.22`. Il motore accetta `ivaPct` e lo
restituisce separato (`p.iva`, `p.lordo`), già usato dalla nuova vista.

Non è un difetto di calcolo — i quattro valori sono uguali. È un difetto di
manutenzione, e finché resta, l'aliquota non è configurabile.

### 5.5 Valori codificati che restano tali dopo questa fase

| Valore | Dove | Perché resta |
| ------ | ---- | ------------ |
| `0.22` IVA ×4 | §5.4 | fuori scopo; da chiudere con la fase White Label / impostazioni |
| Moltiplicatori `3.5 / 2.8 / 2.2` | 108:242-244, campi `p3d-m1..3` | sono **default di campo**, non costanti di calcolo: dal commit `89f8bf3` sono convertiti in margine e il prezzo lo fa il motore |
| Default macchina `150W / 400€ / 2000h` | 108:203-206 | dipendono dal tipo FDM/resina, sono suggerimenti; la nuova vista li marca `fonte: predefinito` |
| Fallita 7% / 12%, manutenzione 0.12 / 0.20 | 108:212-213 | idem |
| `SK = 'p3dq_v4'` | 108:56 | storage separato dal magazzino: **è una seconda fonte di verità per i materiali** (vedi §7) |

---

## 6. Duplicazioni: cosa si sovrappone se monto senza togliere

| Rischio | Verificato | Verdetto |
| ------- | ---------- | -------- |
| Doppi listener | `render()` usa **solo attributi `onclick=`** nell'HTML, zero `addEventListener` sul contenuto | ✗ nessun accumulo: `innerHTML` sostituisce, gli handler inline muoiono col nodo |
| Doppio `render()` | tre router lo chiamano | ✗ innocuo: idempotente, ricostruisce da zero |
| Doppia card «dettaglio costi» | `#p3d-bk` riscritto da `calc()` | **⚠ da sostituire, non affiancare** |
| Doppia card «prezzi» | `#p3d-tiers` riscritto da `calc()` | **⚠ da sostituire, non affiancare** |
| Doppio slider margine | `#p3d-margin` (108:249) e `opzioni.marginePct` della nuova vista | **⚠ uno solo deve comandare** |
| Doppio calcolo | `InglyPrint3D.cost` (vecchia) + `InglyQuoter3DView.calcola` (nuova) | **⚠ due chiamate allo stesso motore nello stesso `calc()`: stesso risultato, doppio lavoro** |
| Id duplicati | QA `duplicati` già in verde | ✓ da mantenere: le nuove sezioni non devono riusare `p3d-*` |

Le cinque righe **⚠** sono la lista di lavoro del montaggio. Non ce ne sono
altre.

---

## 7. Quello che questo montaggio **non** chiude

Dichiarato perché non venga scambiato per fatto.

1. **`p3dq_v4` resta una seconda fonte di verità per i materiali.** Il quoter 3D
   ha il suo magazzino filamenti in localStorage, separato dall'inventario e dal
   ledger. `InglySync.importMaterials()` copia in una direzione sola e non
   ritorna. È lo stesso schema di difetto di «due nomi di campo su un solo
   store»: due sistemi che possiedono un concetto. Va chiuso, non qui.
2. **Il costo non passa dal resolver.** `InglyInventoryCostResolver` esiste e sa
   dire il costo reale di un materiale dal registro; il quoter 3D usa il prezzo
   digitato nel campo `p3d-mkg`. La nuova vista ha già il vocabolario per dirlo
   (`FONTI.resolver`, `badgeFonte`) ma nessuno gliela passa ancora: tutte le
   voci usciranno marcate `predefinito` o `utente`. **È corretto che lo dica.**
3. **PDF e WhatsApp rifanno i totali per conto loro** (108:464, 108:492). Finché
   leggono `LINES` e riapplicano le stesse due operazioni, coincidono; è una
   coincidenza mantenuta a mano, non una garanzia. La regressione «totale UI ===
   totale PDF» è in roadmap.
4. **§5.2 e §5.3** (patch 109) sono difetti reali e misurati. Li chiudo in
   questa fase solo per la parte che il montaggio tocca — il prezzo non si legge
   più dal DOM — e lo dichiaro esplicitamente nel commit.

---

## 8. Criteri di accettazione del montaggio

Questa fase è completa quando, **e non prima**:

- [ ] `#view-print3d` contiene le sezioni B, C, D, E, G, H; F a richiesta
- [ ] `#p3d-bk` e `#p3d-tiers` contengono la nuova vista, **non** la vecchia accanto
- [ ] esiste **un solo** comando del margine, e il numero che mostra è quello che il motore usa
- [ ] esiste **una sola** chiamata al motore per ridisegno (`InglyQuoter3DView.calcola`)
- [ ] `addLine()` scrive lo scaglione corrispondente alla quantità, e `ppz` è il **netto** che l'utente vede dichiarato come netto
- [ ] `sendQ()` usa `addLineFromCalc` e porta il **costo** oltre al prezzo
- [ ] nessun id duplicato, zero errori in console, le 11 suite QA verdi
- [ ] un test verifica che la vista non moltiplichi prezzi (già presente, deve restare verde)

Quello che **non** è criterio di accettazione, per non barare: che il prezzo
cambi. Se il montaggio è corretto, i numeri restano quelli del commit `89f8bf3`.
Cambia cosa si capisce guardandoli.

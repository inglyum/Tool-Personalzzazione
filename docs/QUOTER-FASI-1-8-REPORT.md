# Fasi 1–8 — cosa è cambiato, e cosa no

Chiusura dei blocchi A→H. Ogni numero qui è misurato: da
`npm run audit-quoters`, dai test, o dal browser.

---

## Il risultato in tre righe

La matematica non era il problema. Tredici sonde sui doppi conteggi passavano
già prima di toccare qualsiasi cosa. I problemi erano **dove i numeri
venivano presi** e **cosa il preventivatore diceva di stare calcolando** — più
un difetto di prezzo che costava soldi veri.

---

## Il difetto più caro

Nel Laser B2B il prezzo minimo di lavoro veniva applicato al prezzo di **ogni
singolo pezzo**:

```js
fp2 = Math.max(POL.prezzoMinimo, pr2.netto)   // prezzoMinimo = 15
```

| | prima | adesso |
| --- | --- | --- |
| 5 pz | € 15,00/pz · tot € 75 | € 3,00/pz · tot € 15 |
| 10 pz | € 15,00/pz · tot € 150 | € 2,27/pz · tot € 23 |
| 200 pz | € 15,00/pz · **tot € 3 000** | € 2,02/pz · **tot € 404** |
| margine | 92% su ogni riga | 62% → 50% |

Un margine identico su tutte le righe è il segno che nessuno lo sta più
calcolando. Chi ha inviato preventivi laser di recente ha ragione di
ricontrollarli.

---

## Il caso € 4,50, risolto

La domanda era: perché lo slicer dice € 4,50 e INGLY € 18,68 sullo stesso
pezzo da 290 g. La risposta non richiedeva di abbassare nessuna percentuale.

```
  € 6,96   materiale INGLY   290 g × € 24,00/kg
− € 4,50   materiale slicer  290 g × € 15,52/kg
─────────
  € 2,46   differenza di prezzo del filamento — il residuo, al centesimo
```

**Lo slicer non usa una formula diversa: usa un filamento diverso.** Il
€ 24,00/kg era il valore predefinito di un campo, scritto una volta e mai più
messo in discussione perché niente lo segnalava.

Due conseguenze, entrambe implementate:

1. Il motore ha un livello **materiale** che risponde alla stessa domanda
   dello slicer. Prima il più basso includeva già l'energia, e il confronto
   restava approssimativo per costruzione.
2. `calibra()` lo dice a parole: *«Il riferimento vale il materiale 15,52 €/kg,
   questo conto 24 €/kg: la differenza è di listino, non di formula.»*

Con il costo reale dal magazzino (€ 15,99/kg pagati) il materiale scende a
€ 4,64 e la distanza dallo slicer diventa **quattordici centesimi**.

---

## Blocco per blocco

| Fase | Cosa è entrato |
| ---- | -------------- |
| **1** Audit | `scripts/audit-quoters.mjs`: 63 moduli producono un costo o un prezzo, 12 passano dal motore, 3 lo calcolano ancora per conto loro. Zero moduli su 63 distinguevano consumo misurato da potenza di targa. L'IVA al 22% compariva come letterale in 10 file. |
| **2** Cost Engine | Livello materiale; `energyMode` con priorità misurato → medio → targa; provenienza e confidenza per voce su cinque gradi; ipotesi dichiarate; `explain()` con livelli, fonti, prezzi consigliati e confronto slicer. |
| **4** Magazzino | `material-cost.js`: costo reale = (imponibile + spedizione + accessori) ÷ quantità. Storico con ultimo, medio ponderato, minimo, massimo. Congelamento nel preventivo. Nesting su foglio con kerf e bordo. |
| **3** Quoter 3D | Import slicer con anti-doppio-conteggio; quattro letture dell'energia; cinque posizioni di prezzo con B2B; e la scoperta che `render()` cancellava i campi compilati a ogni ridisegno. |
| **5** Macchine | `machine-cost.js`: corrente, ammortamento, manutenzione e consumabili separate. La manodopera non entra, e un test lo verifica. `power_w` (potenza del laser) non è più scambiabile per `kw` (assorbimento): erano a un fattore quattro. |
| **6** Laser B2B | Il minimo per lavoro, non per pezzo. Prezzo dal margine. Una sola funzione di calcolo al posto di due copie divergenti. |
| **7** Calibrazione | 672 combinazioni: nessun costo negativo o infinito, nessuna divisione per zero, i livelli non si scavalcano, il margine chiesto è quello ottenuto, gli scaglioni concordano con i calcoli singoli. Totali di schermo, PDF e WhatsApp da una funzione sola. |
| **8** UI | «🔍 Perché questo prezzo?»: valore, formula, dato e fiducia per ogni voce. |

---

## Difetti trovati durante il lavoro, non cercati

Tutti misurati, tutti corretti:

- **`sendQ()` non ha mai funzionato.** Chiamava `Quoter.addLine(oggetto)`; quella
  funzione è dichiarata senza parametri e legge il proprio form. Zero righe
  arrivavano al preventivo, mentre un toast verde dichiarava il successo.
- **Il pulsante «→ Catalogo» salvava prodotti a costo 0 e prezzo 0**: leggeva
  `Print3DQuoter._state` (mai esportato) e un `font-size:22px` che nella vista
  non esiste.
- **I due pulsanti di sincronizzazione non sono mai stati iniettati**:
  `querySelector('.p3-card .p3-ct')` restituisce la prima card, e il controllo
  su 'AZIONI' era sempre falso.
- **Lo sconto veniva applicato due volte** — nelle righe e di nuovo sul totale,
  in schermo, PDF e WhatsApp.
- **`render()` cancellava i campi compilati.** Innocuo finché a ridisegnare
  erano due pulsanti; letale con le modalità e l'energia.
- **Il collaudo `laser-b2b.mjs` affermava l'attesa sbagliata**
  (`Math.max(15, prezzoUnitario)`): codificava il difetto invece di scoprirlo.

---

## Un errore mio, e cosa ne è seguito

Il primo passaggio della Fase 6 ha corretto `LaserB2B` in patch 075 — markup
convertito in margine, due copie del calcolo unificate, avviamento
distribuito, sconti trasformati in dati dichiarati. Tutto giusto, e tutto su
un percorso **che la schermata non chiama**: la vista in uso è quella di patch
078, come dicono gli id nel DOM.

È lo stesso errore già fatto una volta con `_calcV32`. La conseguenza pratica:
il nuovo collaudo del Laser B2B legge le celle della tabella vera invece di
interrogare una funzione, perché una funzione può essere corretta e morta allo
stesso tempo.

---

## Cosa resta aperto

Dichiarato, perché non venga scambiato per fatto.

1. **`p3dq_v4` è ancora una seconda lista di materiali.** Il quoter 3D ha il
   suo magazzino filamenti in localStorage, agganciato al registro solo per i
   materiali importati con il prefisso `g`. Va ritirato.
2. **Tre matematiche parallele restano** (patch 075 market intelligence,
   `items/index.js`, patch 099). Il ratchet le tiene contate.
3. **L'IVA al 22% è ancora letterale in dieci file.** Non è un difetto di
   calcolo — i valori coincidono — ma l'aliquota non è configurabile.
4. **Gli sconti di volume del Laser B2B restano ipotesi**: nessun fornitore ha
   confermato il 20% sopra i 50 pezzi. Sono dichiarati come tali a schermo.
5. **UV, DTF e sublimazione** non sono stati trovati come moduli autonomi con
   matematica propria. Se esistono, sono dentro Product Builder o Quoter
   principale, e vanno mappati quando si toccano.
6. **White Label Engine** (temi, colori, font) resta da fare.

---

## Verifiche

```
900 test unitari          12 suite QA          213 controlli a schermo
0 errori JavaScript       0 id duplicati       round-trip byte-identico
```

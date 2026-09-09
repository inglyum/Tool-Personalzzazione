# COST ENGINE V2 — RAPPORTO FINALE

Ramo `claude/ingly-personalization-repo-ekvc0z` · repository `inglyum/Tool-Personalzzazione`
Fasi 1-4 del piano in `COST-ENGINE-V2-AUDIT.md`.

---

## SEZIONI SISTEMATE

| Sezione | Che cosa è cambiato |
| ------- | ------------------- |
| **Motore di costo** | non toccato: era corretto. §50 |
| **Profili economici** | nuovi: manodopera, spese generali, imballo — modulo puro, archivio, pannello |
| **Smart Quoter 3D** | la tariffa oraria arriva dai profili invece che da un `value="18"` nell'HTML |
| **Calcolatore Macchine** (`lasercalc`) | il prezzo passa dal motore; politica, pavimento, sconto massimo; materiali dal magazzino vero; parco macchine davanti al listino |
| **Database** | IndexedDB v31 → v32, tre store nuovi, migrazione additiva |
| **Palette comandi** | «Profili economici» fra i percorsi |

## BUG PRINCIPALI CORRETTI

1. **Il prezzo del Calcolatore Macchine scavalcava il motore.**
   `costo × ricarico × (1 − sconto)`: con ricarico 2,2 e sconto 60% il prezzo
   usciva **sotto il costo**. La riga mostrava il margine negativo e lo vendeva
   lo stesso. Ora il pavimento di margine della politica scelta non si scavalca,
   e uno sconto oltre il massimo consentito viene ridotto — e dichiarato ridotto.
2. **Due prezzi diversi per la stessa riga.** Il passaggio al Quoter ricalcolava
   `unitCost × mk2` per conto suo invece di usare il prezzo mostrato.
3. **La tariffa oraria era scritta a mano in tre punti, con tre valori diversi**
   (18, 15, 18) nello stesso file, più un `value="18"` nell'HTML del 3D.
4. **I due `select` del Calcolatore Macchine non erano legati a nulla**: si
   cambiava l'IVA e si vedevano i prezzi di prima.
5. **`getMaterials()` leggeva `ingly_saas_db.items`**, che è il database di
   licenze e utenti. La tendina mostrava sempre e solo i quindici articoli di
   esempio; chi caricava il proprio magazzino non lo ritrovava.
6. **Due registri per la stessa macchina**: novanta modelli di listino contro il
   parco reale in `equipment`, e vinceva sempre il listino.
7. **Spese generali e imballo non esistevano** in nessun preventivo.

## DATABASE

IndexedDB `InglyMasterDB` **v31 → v32**, 61 store (58 + 3). Migrazione additiva:
`onupgradeneeded` crea gli store mancanti prima di ogni altra cosa, quindi i
nuovi nascono vuoti e nessun dato esistente viene toccato o riletto.

| Store | Chiave | Contenuto |
| ----- | ------ | --------- |
| `labor_profiles` | `key: 'main'` | 9 ruoli, ciascuno con costo interno e tariffa cliente |
| `overhead_profiles` | `key: 'main'` | 9 voci di spesa, modalità di ripartizione, divisore |
| `packaging_items` | `key: 'main'` | voci per pezzo e per ordine, attivabili |

Non è stato toccato Supabase: non contiene i costi (§A.1 dell'audit).

## 3D

Caso obbligatorio del comando — **250 g di PLA, 9 h 57, un pezzo**, misurato
nel browser sul file consegnato, prima e dopo:

```
prima                                    dopo (laboratorio dichiarato)
  materiale     € 6,000                    materiale     € 6,000
  energia       € 0,251                    energia       € 0,251
  macchina      € 1,393                    macchina      € 1,393
  manutenzione  € 1,194                    manutenzione  € 1,194
  finitura      € 1,500                    finitura      € 1,667   (20 €/h)
  scarto        € 0,665                    imballo       € 0,650
  spese gen.    € 0,000                    scarto        € 0,665
                                           spese gen.    € 1,333   (4 €/h)
  costo   € 15,503                         costo   € 18,153
  prezzo  € 25,838                         prezzo  € 30,255
```

Il materiale è `250/1000 × €/kg` come il §55 richiede. L'avviamento resta una
tantum e si divide per la quantità: 1 → € 5,00 · 10 → € 0,50 · 100 → € 0,05.

Le spese generali seguono le **ore uomo**, non le ore macchina: € 4/h × 0,333 h.
È deliberato e preesistente — la stampante lavora da sola, spesso di notte.

## LASER

`CalcMacchine` (route `lasercalc`) passa dal motore. Misurato:

```
costo unitario € 2,571
senza sconto        € 9,00 · € 7,20 · € 5,66   margini 71% · 64% · 55%
sconto 60% chiesto  € 7,65 · € 6,12 · € 4,81   ridotto al 15% (politica Standard)
ricarico ×1,05      € 3,21 · € 3,21 · € 3,21   pavimento 20%
```

Il ricarico ×2,8 dà il **64% di margine**, non il 180%: i due numeri sono
scritti uno accanto all'altro perché non vengano confusi (§61).

Il Laser Quoter B2B (`patches/096`, `patches/121`) era già sul motore da una
fase precedente e non è stato toccato.

## UV · DTF

I profili del motore erano già corretti (§50: KEEP). Quello che mancava era la
prova che i profili economici li raggiungessero: `tests/economia-tecnologie.test.mjs`
verifica su tutte e quattro le tecnologie che manodopera, spese generali e
imballo entrino con lo stesso significato, che il tempo macchina e il tempo uomo
restino due numeri, e che le tre modalità di overhead non si sommino mai.

Un modulo scritto lavorando sul 3D poteva facilmente valere solo per il 3D.

## MACCHINE

`BUILT_IN` è un **listino** (90 modelli commerciali, prezzo di catalogo);
`equipment` è il **parco** (le macchine possedute, con prezzo pagato, ore di
vita e manutenzione). Non si sostituiscono. Il parco va davanti, marcato
«Le tue macchine»; una macchina registrata a metà si vede lo stesso, dichiarata
`· da completare`, e i campi che il record non ha restano vuoti — un valore di
listino direbbe una cosa falsa sul costo orario di quella macchina.

## MATERIALI

Il Calcolatore Macchine ora legge il magazzino vero (IndexedDB `items`,
`gadgets`, `inventory`, `components`), escludendo i record con `type: 'machine'`:
una macchina nella tendina dei consumabili è come vendere la stampante.
Misurato: da 15 articoli di esempio a **66 articoli reali**.

Il costo reale dal registro (`InglyMaterialCost.costoReale`) era già completo —
imponibile, spedizione, accessori, IVA scorporata e dichiarata come tale.

## MANODOPERA

Nove ruoli, due numeri ciascuno. Il **costo interno** è quello che l'ora costa;
la **tariffa cliente** è quella che si fa pagare. Il preventivo usa il primo.
Gli oneri si sommano alla retribuzione; le ore non produttive alzano il costo
dell'ora prodotta (pagato per 1600 ore, ne produce 1200 → +33%).

Un predefinito c'è, e si dichiara tale: un preventivo senza costo del lavoro
sarebbe più falso di uno con un predefinito, perché il lavoro c'è comunque.

## PREZZO

Una sola matematica: `InglyCostEngine.prezzo()`. Margine, ricarico, fisso,
competitivo, premium — la strategia si dichiara. Il pavimento di margine è la
difesa che nessuno sconto scavalca. Il cricchetto di
`tests/architecture-cost-engine.test.mjs` presidia i motori di prezzo duplicati:
**9 e 9, somma 18, invariata**. Ha bocciato la prima versione della correzione
del Calcolatore Macchine, che aveva un calcolo di ripiego. Aveva ragione il test:
senza motore non si calcola un prezzo, si dichiara che manca.

## TEST

```
npm run verify   227 file JS parsati
npm test         1374 / 1374   (+61: 26 sul modulo puro, 35 sulle 4 tecnologie)
npm run qa       50 / 50 suite verdi sulla build finale · 653 controlli · 0 errori JS
```

Una suite ha bocciato la prima versione di questo lavoro, e aveva ragione:
`quoter3d-pulsanti.mjs` costruisce la matrice dei comandi dal DOM e prova a
risolverne i gestori. Il collegamento al pannello dei profili era un
`<a href="#">` con `event.preventDefault()` scritto nell'attributo, e fuori dal
clic `event` non esiste. Il rilevatore l'ha chiamato «funzione che non esiste».
Corretto il codice, non il test: ora è un `<button>` che chiama
`Print3DQuoter.apriProfili()`, una funzione vera del modulo — e si preme anche
con Invio, cosa che un finto collegamento non faceva.

## REGRESSIONE

Nessuna funzionalità rimossa. Le 47 suite preesistenti sono verdi, e con le tre nuove fanno 50. La
sostituzione delle tre moltiplicazioni con il motore lascia i prezzi identici
quando nessuno chiede uno sconto oltre il consentito: `costo × 2,8` resta
`costo × 2,8`. Cambia solo dove prima si vendeva sotto costo.

## COSA RESTA APERTO

1. **Nessun prezzo di mercato ha una fonte né una data.** I 90 modelli di
   macchina e gli 87 materiali del listino restano un ripiego dichiarato. È la
   fase 2 del piano, e non è codice: è ricerca. Il §43 vieta di inventarli.
2. **`€/kWh` è un campo per preventivatore**, con predefinito `0,28` ripetuto in
   più file. Duplicazione vera; unificarla tocca ogni quoter.
3. **Il catalogo non ha `cost_profile_id`**: i prodotti si ricalcolano dal
   `costPrice` memorizzato, non dai parametri tecnici. Fase 13 del piano.
4. **Le spese generali del laboratorio sono a zero** finché INGLY non le compila
   nel pannello. È corretto che lo siano — ma finché restano così, ogni
   preventivo esce più basso del vero. **Questo è l'intervento che cambia i
   numeri più di qualunque altra riga di codice di questo lavoro.**

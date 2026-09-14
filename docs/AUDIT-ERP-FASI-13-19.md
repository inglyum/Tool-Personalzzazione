# Audit ERP · fasi 13-19 — cosa si tiene, cosa si unifica, cosa si ritira

Misurato sul file consegnato (`dist/INGLY-OS.html`) a installazione vuota, il
14 settembre 2026. I conteggi dei record vengono da `IDB.getAll` nel browser;
i conteggi dei punti di scrittura e lettura da una scansione dei sorgenti.
Dove non ho misurato, lo dico.

---

## Fase 13 · il collegamento macchina → ordine

| Cosa | Misura |
| --- | --- |
| store `equipment` | 0 record a installazione vuota |
| store `machines` | non esiste |
| `machineId` nei sorgenti | 19 occorrenze |
| `InglyMachineCost` | presente |
| filtro macchina negli ordini | presente (patch 052, via `InglyOrderFields.passa`) |

**Decisione: KEEP, nessuna modifica.** Il collegamento c'è già in tre punti —
il campo sull'ordine, il filtro nell'elenco, la tariffa oraria nel motore di
costo. Quello che manca non è codice: è il parco macchine, che a installazione
vuota è vuoto perché lo compila l'utente. Aggiungere qui un parco predefinito
inventerebbe macchine che il laboratorio non ha, e il mandato vieta i numeri
senza fonte.

## Fase 14 · i driver di costo

Già consolidati in `InglyCostEngine` con i profili economici (manodopera,
spese generali, imballo) e verificati da `tests/qa/cost-audit.js` e
`tests/qa/profili-economici-pannello.mjs`. **KEEP.**

Il motore dichiara la fonte e l'affidabilità di ogni voce, e `cost-audit`
elenca i parametri non dichiarati invece di sostituirli con un default
plausibile. È il comportamento che serve: un costo mancante deve vedersi.

## Fase 15 · i magazzini paralleli

| Store | Record (vuota) | Scritture | Letture | Decisione |
| --- | ---: | ---: | ---: | --- |
| `materials` | 172 | 7 | 12 | **KEEP** — è il magazzino vivo |
| `gadgets` | 61 | 4 | 11 | **KEEP** — famiglia distinta, non doppione |
| `catalog` | 70 | — | — | **KEEP** — prodotti finiti, non materie |
| `items` | 0 | 10 | 5 | **KEEP** — destinazione dell'unificazione |
| `components` | 0 | 3 | 1 | **KEEP** — vuoto, lo riempie l'utente |
| `paints` | 0 | 1 | 5 | **KEEP** — idem |
| `inventory` | 4 | 3 | 7 | **CONSOLIDATE** — i 4 record sono il seed storico |
| `pipeline` | 0 | 12 | 15 | **DEPRECATE** — già derivata dagli ordini |

`inventory` contiene esattamente i quattro materiali scritti in
`helpers.js:DEFAULTS`: due plexiglass e due compensati, con giacenza zero.
Non è un magazzino: è un residuo. **Non si cancella** — il mandato lo vieta e
qualche installazione potrebbe averci scritto sopra. Si consolida leggendolo
insieme a `materials` dove serve, come già fa il resolver dei costi.

`pipeline` era la vista parallela degli ordini, ritirata quando Orders è
diventata l'unica fonte di verità. I 12 punti che ci scrivono sono
allineamenti di compatibilità, non una seconda verità: l'elenco degli ordini
non la legge più per decidere niente.

## Fase 16 · pagamenti

Vedi il commit «Fase 16». `InglyDomain.payments` esisteva già e resta l'unico
motore; `InglyPagamenti` è il punto unico in cui una vendita diventa
incassata. Tre percorsi diversi ora ne fanno uno.

## Fase 17 · i punti di scrittura della pipeline

12 scritture, 15 letture. Nessuna decide lo stato di un ordine: lo stato vive
su `orders.stage`, e la pipeline lo riceve. **DEPRECATE senza rimuovere**: il
nome resta trovabile tramite `NAV_ALIASES`, i record restano dove sono.

## Fase 18 · le rotte

54 patch nominano `App.navigate`, 36 `renderSection`. Non sono 54 router in
concorrenza: `tests/qa/navigazione-completa.mjs` e `tests/qa/rotte-e-pulsanti.mjs`
attraversano tutte le rotte dell'applicazione e passano, il che significa che
una sola vince e le altre la avvolgono.

**Non ho classificato le 54 patch una per una.** Quello che ho verificato è il
comportamento: ogni rotta porta alla sezione giusta e nessuna finisce su una
schermata vuota. Una classifica file per file sarebbe un lavoro a sé, e
cambierebbe la conclusione solo se una rotta fosse rotta — e nessuna lo è.

## Fase 19 · i filtri globali dell'analisi

I filtri per tecnologia esistono su tre viste — ordini, vendite, dashboard —
e passano tutti da `InglyProduction.passa` e `InglyProduction.filtriDisponibili`,
cioè da una definizione sola delle otto tecnologie. Un ordine misto conta una
volta sola: lo garantisce `quotaPerTecnologia`, e lo verifica
`tests/qa/erp-end-to-end.mjs` sui quattro ordini che sommano 750 e non 900.

**KEEP.** Un filtro globale unico in testa all'applicazione sarebbe una quarta
implementazione della stessa selezione, e il mandato chiede il contrario.

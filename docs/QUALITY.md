# Qualità — uno scarto diventa una decisione

`src/product/quality-ncr.js` (`InglyQualityNCR`), `src/product/quality-ncr-store.js`
(`InglyQualityNCRStore`). UI: `GestioneOrdini.openProductionPanel` (Pannello
Produzione, `src/legacy/patches/052-...js`).

## Il gap che chiude

`InglyOperazioni` (il routing di produzione, Fase precedente) sa da tempo
contare buoni, scarti e rifacimenti su un'operazione — `qualita()` e
`riepilogo()` esistono, sono testati a unità, e il costo dei rifacimenti
entra già nel costo reale dell'ordine. Misurato prima di questo lavoro:
**zero superfici** dell'applicazione mostravano quel routing o permettevano
di registrarne i numeri. L'unico punto che leggeva `InglyOperazioni` per
davvero era `GestioneOrdini._badgeTec`, un badge «✓ 2/3» accanto al nome
del cliente in lista ordini — un contatore, non uno strumento.

Il conto esisteva; la decisione su un pezzo non conforme — rifare, buttare,
accettare con una deroga, rispedire al fornitore — non aveva un posto dove
essere scritta, con chi l'ha presa e quando.

## Cosa fa

`InglyQualityNCR` è puro, stesso schema di `machine-maintenance.js` e
`purchase-order.js`:

- `crea(ncr)` — una non conformità congelata alla nascita, legata a
  `orderId` (obbligatorio) e `operationId` (quando viene da un'operazione
  del routing). Nasce sempre `aperta`, anche se una disposizione era già
  dichiarata: la disposizione diventa definitiva solo chiudendo.
- `daOperazione(operazione, opzioni)` — da un'operazione normalizzata di
  `InglyOperazioni` (che porta già `wasteQuantity`/`reworkQuantity`/
  `wasteReason`) a una **proposta** di non conformità. Non propone niente
  senza uno scarto o un rifacimento contati, e non propone niente senza un
  motivo dichiarato — un numero senza perché non diventa una non
  conformità, resta solo un conteggio.
- `chiudi(ncr, esito)` — richiede una disposizione valida fra le quattro
  (`rilavorazione`, `scarto`, `accettato_con_deroga`, `reso_fornitore`);
  registra chi ha chiuso e quando. Non si chiude due volte, e non modifica
  il record originale — nasce un nuovo record chiuso, i fatti che hanno
  aperto la non conformità restano quelli scritti all'inizio.
- `riepilogo(ncrs)` — aperte/chiuse, per disposizione, per motivo. Non un
  secondo modo di contare scarti: quello resta a `InglyOperazioni.riepilogo`,
  questo conta le *decisioni*, non i pezzi.

`InglyQualityNCRStore` scrive in `quality_ncr` (IDB, nuovo store, v33 —
migrazione additiva, nessun dato esistente toccato).

## UI

Il Pannello Produzione di un ordine (icona ⚙️ in lista, o
`GestioneOrdini.openProductionPanel(id)`) ha ora una sezione «🔍 Qualità»:

- il routing dell'ordine, con lo stato di ogni operazione. Se l'ordine ha
  una tecnologia dichiarata ma non ha ancora un routing, `costruisciDaOrdine`
  ne genera uno **e lo scrive subito** — senza, sparirebbe alla prossima
  apertura del pannello;
- per ogni operazione, tre campi (buoni/scarti/da rifare) e un motivo, con
  un pulsante «Registra» che scrive i numeri sull'operazione vera (non un
  log separato) e propone una non conformità se scarto o rifacimento hanno
  un motivo;
- le non conformità aperte dell'ordine, ciascuna con un selettore di
  disposizione e un pulsante «Chiudi».

## Cosa NON è stato fatto, e perché

| Non fatto | Perché |
| --- | --- |
| Checklist di ispezione (elenco di controlli da spuntare prima del completamento) | nessun modello di checklist esiste in questo progetto per nessun processo — costruirne uno per la sola Qualità sarebbe la soluzione sbagliata; è un intervento più ampio, fuori da questo giro |
| Un flusso di approvazione a più passaggi (proposta → revisione → approvazione) | `chiudi()` chiude con una disposizione e chi l'ha scelta: un secondo stato intermedio (`in_revisione`) non ha ancora un caso d'uso reale misurato in questo prodotto — aggiungerlo ora sarebbe un workflow immaginato, non richiesto dai dati |
| Notifiche o KPI di qualità in dashboard | `InglyQualityNCR.riepilogo()` esiste ed è pronto; collegarlo alla dashboard è un'estensione dell'esistente, non un blocco — rimandato per restare su un verticale alla volta |
| Blocco del completamento ordine senza qualità registrata | imporrebbe un obbligo su ordini che oggi non lo hanno mai avuto: un cambio di comportamento su tutta la produzione esistente, non una correzione — richiede una decisione di prodotto esplicita |

## Test

- `tests/quality-ncr.test.mjs` — 24 unit: validazione, congelamento,
  chiusura (una sola volta, con disposizione valida), proposta da
  un'operazione (mai senza scarto, mai senza motivo), riepilogo.
- `tests/qa/qualita-non-conformita.mjs` — 16 controlli in browser reale:
  apertura del pannello con routing dedotto e persistito, registrazione
  qualità con click vero, nascita della non conformità, chiusura con
  disposizione, persistenza dopo un ricaricamento vero.

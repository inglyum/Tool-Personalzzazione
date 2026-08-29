# ARCHITECTURE_AUDIT — INGLY OS

**Fase 0 della trasformazione.** Ogni numero di questo documento è misurato da
`scripts/audit-architecture.mjs`, non stimato. Il comando si rilancia dopo ogni
consolidamento: se la complessità scende davvero, scende qui.

```bash
node scripts/audit-architecture.mjs          # riepilogo
node scripts/audit-architecture.mjs --json   # dettaglio con i file di provenienza
```

Misurazione su **220 file sorgente** (9,5 MB di codice storico, 129 patch, 20 fogli di stile).

---

## Quadro d'insieme

| Misura | Valore | Dove |
|---|---:|---|
| Override / monkey patch | **212** | riassegnazioni di funzioni già definite altrove |
| Funzioni con lo stesso nome in più file | **146** | |
| Funzioni `render*` con lo stesso nome | **44** | `render` in 90 file, `renderSection` in 35 |
| API globali dichiarate | **390** | 9 dichiarate in più file |
| `onclick` in linea | **1.946** | |
| `addEventListener` | **415** | |
| `setInterval` | **89** | in 48 file |
| `MutationObserver` | **21** | in 19 file |
| Sezioni (`view-*`) | **92** | |
| Chiavi localStorage | **116** | 26 scritte da più file |
| Store IndexedDB | **32** | 9 scritti da più file |
| **`catch` che non gestiscono** | **558** | 534 nudi · 24 con spiegazione · in 134 file |
| Calcoli letti dal DOM | **219** | in 41 file |
| `!important` | **298** | in 39 file |
| Selettori CSS ripetuti in più fogli | **66** | |
| Emoji in stringhe di interfaccia | **6.416** | in 136 file |

> **Nota sulla prima misurazione.** I numeri di questa tabella sono leggermente
> diversi da quelli pubblicati alla prima esecuzione, perché lo strumento è
> stato corretto: contava anche i pattern che comparivano dentro i commenti —
> compresi i due `catch {}` citati nella propria documentazione per spiegare
> perché non si devono scrivere. Uno strumento di misura che misura sé stesso
> non serve. Ora i conteggi si fanno sul codice, e i `catch` che inghiottono in
> silenzio sono distinti fra **nudi** (una distrazione) e **con spiegazione**
> (una scelta): un commento non gestisce un errore, ma correggere i due casi
> non è lo stesso lavoro.

Legenda priorità: **P0** blocca il resto · **P1** alto · **P2** medio · **P3** basso.
Il *rischio* è quello dell'intervento, non del difetto.

---

## A1 · Il modello patch-on-patch — 211 override

**Problema.** 211 punti riassegnano una funzione o un oggetto già definito
altrove. Chi vince è deciso dall'ordine di caricamento di 129 patch.

**Origine.** Ogni versione storica ha aggiunto un file invece di modificare
quello esistente: `v27 master fix`, `v30 professional`, `v35 feature pack`,
`v36 improvements`, `v37 task force`, `v37b final part 2`.

**Impatto.** Una correzione può essere annullata da una patch caricata dopo,
in silenzio. È già successo in questo progetto: due patch costruivano la stessa
navigazione morta e una sola vinceva; una patch dichiarava l'ambra per lo stato
attivo e un'altra l'indaco, vinceva l'ultima caricata.

**Soluzione.** Namespace unico per dominio (`Ingly.Modules.*`), un solo
proprietario per concetto. Il meccanismo `overrides` / `drop` di
`scripts/compose.mjs` è già la sede dichiarativa dove si ritira una patch:
è così che sono state ritirate 6 layer di design e 7 patch di sidebar.

**Priorità P0** — è la causa di quasi tutto il resto. **Rischio alto**: va fatto
per componente, mai in blocco.

---

## A2 · 558 `catch` che non gestiscono — il software mente sui salvataggi

**Problema.** 558 blocchi `catch` senza una sola istruzione, in 134 file — 534
nudi e 24 con un commento al posto della gestione. Un salvataggio fallito non
lascia traccia e la funzione chiamante prosegue come se fosse riuscito.

**Origine.** `try{...}catch(e){}` usato come scorciatoia per non far crollare la
pagina su un dato imperfetto.

**Impatto.** È la classe di difetto più pericolosa del prodotto: **l'utente vede
"salvato" e il dato non c'è**. Con localStorage pieno il fallimento è
sistematico e invisibile. Concentrazione: `settings/index.js` 26,
`095-v37b-task-force` 25, `117-smart-search` 24, `core/app.js` 15.

**Stato.** La via alternativa esiste ed è collaudata — `Ingly.Storage.set()`
non lancia e non dichiara mai riuscito un salvataggio che non lo è, verificando
con una rilettura. I 558 punti storici restano da convertire, modulo per
modulo: è una sostituzione, non una riscrittura.

**Soluzione.** `SafeStorage` + `ErrorLogger` centrali (Fase 28). Sostituzione
progressiva partendo dai percorsi di **scrittura dati**, non dai percorsi di
sola lettura. La guardia su `QuotaExceededError` esiste già in
`src/core/storage/guard.js`: va estesa, non riscritta.

**Priorità P0** sui percorsi di scrittura. **Rischio basso**: aggiungere un log
non cambia il comportamento riuscito.

---

## A3 · Database paralleli — 26 chiavi scritte da più file

**Problema.** Chiavi di storage scritte da più moduli indipendenti:

| Chiave | File che ci scrivono |
|---|---:|
| `lb2b_quotes_v1` | 10 |
| `ingly_orders_pro_v1` | 9 |
| `ingly_crm_v1` | 8 |
| `ingly_settings_main` | 7 |
| `ingly_saas_db` | 5 |

Su IndexedDB: **`orders` toccato da 20 file**, `settings` da 14, `quotes` da 8.

**Origine.** Nessun adapter di dominio: ogni modulo legge e scrive direttamente.

**Impatto.** Due scritture concorrenti si sovrascrivono senza accorgersene. Un
consolidamento storico (`_storageConsolidate`) prometteva un merge e faceva una
scelta: ogni record presente solo nella versione più vecchia spariva, e la
console stampava «migration completed». Corretto, ma la causa — l'accesso
diretto da ovunque — è ancora lì.

**Soluzione.** Un domain adapter per aggregato (Fase 2). Nessun modulo tocca più
lo store direttamente. Migrazione versionata con checkpoint: il framework esiste
già dalla Fase 3 del lavoro precedente.

**Priorità P0.** **Rischio medio**: tocca dati reali dell'utente, va presidiato
da test di migrazione con conteggio prima/dopo.

---

## A4 · Pipeline è già un mirror di Orders

**Stato: fatto.** La voce di menu è stata ritirata, la migrazione è in opera e
presidiata da 25 test; restano 98 riferimenti interni allo store, da togliere
per modulo. Il reperto originale, per memoria:

**Problema.** Lo store `pipeline` non è una sorgente indipendente: `PipelineOS`
scrive in `orders` e **subito dopo** duplica il record in `pipeline` con
`_source:'orders'`, `_sourceId:id` e `id: id + 1`.

**Origine.** Una vista Kanban che si è portata dietro un proprio archivio.

**Impatto.** Due verità sullo stesso ordine, e un id derivato (`id + 1`) che può
collidere. Sei patch rimandano ancora a `App.navigate('pipeline')`; la patch 085
inietta la voce `🗂️ Pipeline` nella sidebar.

**Soluzione.** La Fase 3 è più semplice di quanto sembri, proprio perché
pipeline è derivato: migrare i soli record **senza** corrispondente in orders,
normalizzare i campi, ritirare la UI, conservare lo store come sola sorgente di
migrazione. `orders` diventa la Single Source of Truth.

**Priorità P0** (richiesto esplicitamente). **Rischio medio** — è una migrazione
di dati: serve il conteggio record prima/dopo e un checkpoint.

---

## A5 · 219 calcoli letti dal DOM

**Problema.** 219 punti calcolano leggendo valori dagli elementi della pagina:
`parseFloat(document.getElementById(...).value)`. Concentrazione:
`quoter/index.js` 43, `catalog/index.js` 27, `items/index.js` 18,
`086-laserb2b-pro` 11.

**Origine.** Il calcolo è nato dentro la funzione che disegna il modulo.

**Impatto.** La matematica **non è testabile senza aprire una pagina**, e
dipende da quale schermata è montata. È la ragione per cui i difetti di prezzo
sopravvivono ai collaudi.

**Soluzione.** `InglyCostEngine` come funzione pura (Fase 33). Il modello esiste
già: `src/product/print3d-cost.js` è una funzione pura presidiata da 30 test che
girano senza browser. Il pattern va esteso, non reinventato.

**Priorità P0** per i quoter. **Rischio basso**: il motore puro si costruisce
accanto e la UI ci si sposta sopra dopo, con i test già verdi.

---

## A6 · Motori di costo separati e già sbagliati

**Problema.** Ogni quoter ha la propria matematica. Nel modulo apparel,
eseguendo il codice spedito con le impostazioni predefinite:

- a **200 pezzi il preventivo esce sotto costo** (margine −5,0%), perché lo
  sconto quantità (32%) supera il ricarico (40%);
- «margine 40%» restituisce **28,6%**: il campo è un ricarico;
- la serigrafia costa 3,20 €/pz sia per 1 pezzo sia per 200: nessuna
  distinzione fra costi una tantum e costi per pezzo;
- la superficie di stampa non esiste: un logo 5×5 cm e una A3 costano identici.

**Origine.** Tre quoter scritti in tre momenti diversi, ognuno con il proprio
conto.

**Impatto.** Prezzi non difendibili. È il difetto con conseguenza economica
diretta.

**Soluzione.** Un solo `InglyCostEngine` con profili per tecnologia
(3D · LASER · UV · DTF · SUBLIMATION), come richiesto dalla Fase 33.
Analisi completa del caso apparel in `docs/APPAREL-ROADMAP.md`.

**Priorità P0.** **Rischio basso** con i test matematici davanti.

---

## A7 · 44 funzioni di render omonime

**Problema.** `render` dichiarata in 90 file, `renderSection` in 35,
`renderWidget` / `renderLines` / `renderList` in 6 ciascuna.

**Origine.** Ogni modulo ha la sua, più le patch che ne aggiungono altre.

**Impatto.** Render non idempotenti: due sistemi disegnano lo stesso nodo. È il
difetto già misurato sulla navigazione — due stelle per voce su 98 voci, due
campi di ricerca, tre onboarding.

**Soluzione.** Un renderer per modulo, registrato e idempotente. Il presidio
esiste già: `tests/qa/duplicati.mjs` fallisce se un componente compare due volte.

**Priorità P1.** **Rischio medio**.

---

## A8 · 298 `!important` e 66 selettori ripetuti

**Problema.** 298 dichiarazioni `!important` in 39 file; 66 selettori CSS
definiti in più fogli.

**Impatto.** Dimostrato in questa stessa sessione: `.nav-item{display:flex
!important}` in un layer basso rendeva **impossibile a qualunque regola**
nascondere una voce di menu — né la regola del browser per un `<details>`
chiuso, né il design system, né il gestore dei moduli. Un `!important` in un
layer basso batte ogni dichiarazione normale di un layer alto, e anche lo stile
in linea.

**Soluzione.** I layer a cascata sono già in opera (`@layer legacy` + design
system non stratificato). Va tolto l'`!important` dai fogli storici, uno alla
volta, ognuno registrato in `baseline/deliberate-changes.json` con la ragione.

**Priorità P1.** **Rischio basso**: ogni rimozione è verificabile a schermo con
`tests/qa/sovrapposizioni.mjs`.

---

## A9 · 1.946 `onclick` in linea

**Problema.** 1.946 gestori scritti negli attributi HTML.

**Impatto.** Nessuna delega, nessun test possibile sul comportamento, nessuna
Content-Security-Policy applicabile, e ogni re-render ricrea i gestori.

**Soluzione.** Delega per componente. **La specifica stessa vieta la migrazione
massiva in un passaggio**: si procede modulo per modulo, partendo da quelli già
consolidati.

**Priorità P2.** **Rischio alto** se fatto in blocco, basso se per componente.

---

## A10 · 89 `setInterval` e 21 `MutationObserver`

**Problema.** 89 timer ripetuti in 48 file (17 nella sola patch 117), 21
osservatori del DOM in 19 file.

**Impatto.** Lavoro ripetuto per sempre anche a pagina ferma. Gli osservatori
sulla sidebar si riattivavano a vicenda: due patch cancellavano voci che una
terza ricreava, all'infinito. Entrambe sono già state ritirate.

**Soluzione.** Sostituire l'osservazione con la notifica (`NavBus` esiste già).
Ogni timer deve avere un proprietario che lo può fermare.

**Priorità P2.** **Rischio basso**.

---

## A11 · 6.416 emoji nelle interfacce operative

**Problema.** 6.416 emoji in stringhe di interfaccia, in 136 file.
`marketing/index.js` 707, `settings/index.js` 593, `ai/index.js` 183.

**Impatto.** Convivono con Font Awesome: due sistemi di icone per la stessa
azione, resa diversa fra sistemi operativi, nessuna etichetta accessibile.

**Soluzione.** `IconRegistry` unico (Fase 14). Un'azione, un'icona, un nodo.
Il volume impone di procedere per modulo.

**Priorità P2.** **Rischio basso** ma volume alto.

---

## A12 · 390 API globali

**Problema.** 390 simboli globali; 9 dichiarati in più file
(`Goals` in 3, poi `GlobalSearch`, `InglySync`, `PrimaNota`, `BarcodeScanner`,
`KeyboardShortcuts`, `WATemplates`, `BDW`, `InglyCloudAdmin`).

**Impatto.** Una dichiarazione tardiva sostituisce la precedente in silenzio.

**Soluzione.** Namespace `Ingly.*` con alias di compatibilità per i nomi storici,
così nulla si rompe durante la transizione.

**Priorità P1.** **Rischio medio**.

---

## Ordine di esecuzione che ne discende

L'ordine non è quello della numerazione delle fasi, ma quello delle dipendenze:

1. **A2** (`catch` vuoti sui percorsi di scrittura) — nessuna migrazione è
   sicura finché un salvataggio può fallire in silenzio.
2. **A5 + A6** (motore di costo puro) — si costruisce accanto, non rompe nulla,
   e sblocca tutti i quoter.
3. **A4** (Pipeline → Orders) — la migrazione richiesta, con il conteggio.
4. **A3** (adapter di dominio) — dopo che la migrazione ha dimostrato il metodo.
5. **A1 + A12** (namespace e ritiro delle patch) — per componente.
6. **A7 · A8 · A9 · A10 · A11** — presidiati dai collaudi grafici già in opera.

Ogni passo è verde solo quando `npm run check` e `npm run qa` lo confermano, e
ogni modifica al codice storico è registrata in `baseline/deliberate-changes.json`
con la ragione.
